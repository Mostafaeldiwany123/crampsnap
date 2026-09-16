import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ArrowUp, Plus, Copy, Check, ClockCounterClockwise, Trash, ChatTeardropText } from 'phosphor-react-native';
import { Note } from '@/types';
import { getNotes } from '@/services/notes';
import { chatWithLibraryAgent, ChatMessage } from '@/services/googleai';
import { MarkdownRenderer, sanitizeMarkdownMath } from '@/components/MarkdownRenderer';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';
import { useRouter, useFocusEffect } from 'expo-router';

const CHAT_SESSIONS_KEY = 'library_agent_chat_sessions_v1';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatSession {
  id: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface NoteSegment { type: 'note'; noteId: string; }
interface TextSegment { type: 'text'; content: string; }
type Segment = TextSegment | NoteSegment;

function hasMath(text: string): boolean {
  return text.includes('$') || text.includes('\\(') || text.includes('\\[');
}

function parseSegments(rawContent: string): Segment[] {
  if (!rawContent) return [];

  // 1. Unwrap math if trapped in backticks: `$x$` -> $x$
  let text = sanitizeMarkdownMath(rawContent);

  // 2. Remove bullets or formatting directly wrapping [NOTE:id]
  text = text
    .replace(/(?:^|\n)\s*[\*\-]\s*(\[NOTE:[a-zA-Z0-9-]+\])/g, '\n$1')
    .replace(/[`*]+(\[NOTE:[a-zA-Z0-9-]+\])[`*]*/g, '$1')
    .replace(/(\[NOTE:[a-zA-Z0-9-]+\])[`*]+/g, '$1');

  return text
    .split(/(\[NOTE:[a-zA-Z0-9-]+\])/g)
    .filter(p => p && p.trim().length > 0)
    .map(part => {
      if (part.startsWith('[NOTE:') && part.endsWith(']')) {
        return { type: 'note', noteId: part.replace('[NOTE:', '').replace(']', '') } as NoteSegment;
      }
      return { type: 'text', content: part } as TextSegment;
    });
}

function SimpleMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { elements.push(<View key={i} style={{ height: 4 }} />); i++; continue; }
    // Skip lines that are only stray asterisks or formatting symbols (e.g. "*", "**", "***", "-")
    if (/^[\*\-_]{1,3}$/.test(line.trim())) {
      i++;
      continue;
    }
    const h1 = line.match(/^#\s+(.*)/);
    const h2 = line.match(/^##\s+(.*)/);
    const h3 = line.match(/^###\s+(.*)/);
    if (h1) { elements.push(<Text key={i} style={md.h1}>{inlineFmt(h1[1])}</Text>); i++; continue; }
    if (h2) { elements.push(<Text key={i} style={md.h2}>{inlineFmt(h2[1])}</Text>); i++; continue; }
    if (h3) { elements.push(<Text key={i} style={md.h3}>{inlineFmt(h3[1])}</Text>); i++; continue; }
    const bullet = line.match(/^[\-\*]\s+(.*)/);
    if (bullet) {
      // If bullet text is empty (stray bullet), skip it
      if (!bullet[1].trim()) {
        i++;
        continue;
      }
      elements.push(
        <View key={i} style={md.row}><Text style={md.dot}>•</Text><Text style={md.body}>{inlineFmt(bullet[1])}</Text></View>
      ); i++; continue;
    }
    const num = line.match(/^(\d+)\.\s+(.*)/);
    if (num) {
      elements.push(
        <View key={i} style={md.row}><Text style={md.dot}>{num[1]}.</Text><Text style={md.body}>{inlineFmt(num[2])}</Text></View>
      ); i++; continue;
    }
    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { code.push(lines[i]); i++; }
      elements.push(<View key={i} style={md.codeBlock}><Text style={md.codeText}>{code.join('\n')}</Text></View>);
      i++; continue;
    }
    elements.push(<Text key={i} style={md.body}>{inlineFmt(line)}</Text>);
    i++;
  }
  return <View>{elements}</View>;
}

function inlineFmt(text: string): React.ReactNode[] {
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  const result: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) result.push(<Text key={last}>{text.slice(last, m.index)}</Text>);
    if (m[2]) result.push(<Text key={m.index} style={{ fontWeight: '700' }}>{m[2]}</Text>);
    else if (m[3]) result.push(<Text key={m.index} style={{ fontStyle: 'italic' }}>{m[3]}</Text>);
    else if (m[4]) result.push(<Text key={m.index} style={md.inlineCode}>{m[4]}</Text>);
    last = m.index + m[0].length;
  }
  if (last < text.length) result.push(<Text key={last}>{text.slice(last)}</Text>);
  return result.length > 0 ? result : [<Text key="0">{text}</Text>];
}

const md = StyleSheet.create({
  h1: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginTop: 8, marginBottom: 3 },
  h2: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginTop: 6, marginBottom: 2 },
  h3: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 4, marginBottom: 2 },
  body: { fontSize: 15, color: '#1E293B', lineHeight: 22, fontFamily: 'Assistant', marginBottom: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3, paddingRight: 8 },
  dot: { fontSize: 15, color: '#64748B', marginRight: 8, fontFamily: 'Assistant' },
  codeBlock: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10, marginVertical: 6 },
  codeText: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: '#0F172A' },
  inlineCode: { backgroundColor: '#F1F5F9', borderRadius: 4, paddingHorizontal: 4, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: '#0F172A' },
});

function NoteCard({ noteId, notes, onPress }: { noteId: string; notes: Note[]; onPress: (note: Note) => void }) {
  const note = notes.find(n => n.id === noteId);
  if (!note || !note.image_url) {
    return <View style={styles.noteMissing}><Text style={styles.noteMissingText}>Image not found</Text></View>;
  }
  return (
    <TouchableOpacity style={styles.noteCard} activeOpacity={0.85} onPress={() => onPress(note)}>
      <Image source={{ uri: note.image_url }} style={styles.noteCardImg} resizeMode="cover" />
      {!!note.title && (
        <View style={styles.noteCardFooter}>
          <Text style={styles.noteCardTitle} numberOfLines={1}>{note.title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const cleaned = text
      .replace(/\[NOTE:[a-zA-Z0-9-]+\]/g, '')
      .replace(/(?:\r?\n){3,}/g, '\n\n')
      .trim();
    await Clipboard.setStringAsync(cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      {copied ? (
        <Check size={18} color="#10B981" weight="bold" />
      ) : (
        <Copy size={16} color="#94A3B8" weight="bold" />
      )}
    </TouchableOpacity>
  );
}

const MessageBubble = React.memo(({ item, notes, onNotePress }: {
  item: ChatMessage;
  notes: Note[];
  onNotePress: (note: Note) => void;
}) => {
  if (item.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{item.content}</Text>
        </View>
      </View>
    );
  }
  const segments = parseSegments(item.content);
  return (
    <View style={styles.aiRow}>
      {segments.map((seg, i) =>
        seg.type === 'note' ? (
          <NoteCard key={i} noteId={seg.noteId} notes={notes} onPress={onNotePress} />
        ) : seg.content.trim() ? (
          hasMath(seg.content) ? (
            <View key={i} style={styles.mathContainer}>
              <MarkdownRenderer content={seg.content} />
            </View>
          ) : (
            <SimpleMarkdown key={i} text={seg.content} />
          )
        ) : null
      )}
      {item.content.length > 0 && <CopyButton text={item.content} />}
    </View>
  );
});

function SimpleThinkingText() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.loadingRow}>
      <Text style={styles.loadingTextSimple}>Searching notes{dots}</Text>
    </View>
  );
}

export default function LibraryAgentScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      getNotes().then(fetched => {
        if (fetched) setNotes(fetched);
      });
    }, [])
  );

  useEffect(() => {
    AsyncStorage.getItem(CHAT_SESSIONS_KEY).then(raw => {
      if (raw) {
        try {
          const saved: ChatSession[] = JSON.parse(raw);
          if (Array.isArray(saved)) {
            saved.sort((a, b) => b.updatedAt - a.updatedAt);
            setSessions(saved);
            if (saved.length > 0) setCurrentSessionId(saved[0].id);
          }
        } catch (_) {}
      }
    });
  }, []);

  const saveSession = useCallback(async (sessionId: string, newHistory: ChatMessage[]) => {
    setSessions(prev => {
      let existing = [...prev];
      const idx = existing.findIndex(s => s.id === sessionId);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], messages: newHistory, updatedAt: Date.now() };
      } else {
        existing.unshift({ id: sessionId, messages: newHistory, updatedAt: Date.now() });
      }
      existing.sort((a, b) => b.updatedAt - a.updatedAt);
      AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(existing));
      return existing;
    });
  }, []);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;
    
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = uuid.v4().toString();
      setCurrentSessionId(sessionId);
    }

    const userMsg: ChatMessage = { role: 'user', content: inputText.trim() };
    const currentSession = sessions.find(s => s.id === sessionId);
    const history = currentSession ? currentSession.messages : [];
    
    const newHistory = [...history, userMsg];
    await saveSession(sessionId, newHistory);

    setInputText('');
    setIsLoading(true);

    try {
      // Always fetch fresh notes directly from storage to ensure deleted/added notes are updated
      const freshNotes = (await getNotes()) || [];
      setNotes(freshNotes);

      const context = freshNotes.length > 0
        ? freshNotes.map(n =>
            `ID: ${n.id} | Title: ${n.title} | Tags: ${(n.tags || []).join(', ')} | Date: ${new Date(n.created_at).toLocaleDateString()} | Summary: ${n.summary || ''} | Personal Notes: ${n.user_note || 'None'}`
          ).join('\n---\n')
        : 'The user library is currently empty. There are no notes or images.';

      const responseText = await chatWithLibraryAgent(newHistory, context);

      const aiMsg: ChatMessage = { role: 'model', content: responseText };
      await saveSession(sessionId, [...newHistory, aiMsg]);

    } catch (error: any) {
      const aiMsg: ChatMessage = { role: 'model', content: `**Error:** ${error.message || 'Failed to get response'}` };
      await saveSession(sessionId, [...newHistory, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setIsLoading(false);
    setShowHistory(false);
    setInputText('');
  };

  const handleLoadSession = (id: string) => {
    setCurrentSessionId(id);
    setShowHistory(false);
  };

  const handleDeleteSession = (sessionIdToDelete: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to remove this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSessions(prev => {
              const updated = prev.filter(s => s.id !== sessionIdToDelete);
              AsyncStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(updated));
              return updated;
            });

            if (currentSessionId === sessionIdToDelete) {
              setCurrentSessionId(null);
              setInputText('');
            }
          },
        },
      ]
    );
  };

  const currentHistory = currentSessionId ? sessions.find(s => s.id === currentSessionId)?.messages || [] : [];
  const isEmpty = currentHistory.length === 0 && !isLoading;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: 0 }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <X size={22} color="#0F172A" weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>CramSnap Agent</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.headerBtn}>
              <ClockCounterClockwise size={22} color="#64748B" weight="bold" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNewChat} style={styles.headerBtn}>
              <Plus size={22} color="#64748B" weight="bold" />
            </TouchableOpacity>
          </View>
        </View>

        {isEmpty ? (
          <View style={styles.emptyState}>
            <Image source={require('../assets/images/icon.png')} style={styles.emptyIcon} resizeMode="contain" />
            <Text style={styles.emptyTitle}>What image are you{'\n'}looking for?</Text>
            <Text style={styles.emptySub}>Find notes, summarize lectures,{'\n'}or describe your captures.</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={currentHistory}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <MessageBubble 
                item={item} 
                notes={notes} 
                onNotePress={(note) => router.push({ pathname: '/note/preview', params: { id: note.id, content: note.content } })} 
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              isLoading ? <SimpleThinkingText /> : null
            }
          />
        )}

        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Ask about your notes..."
              placeholderTextColor="#94A3B8"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isLoading) && { opacity: 0.35 }]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <ArrowUp size={18} color="#FFFFFF" weight="bold" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={showHistory}
        animationType="slide"
        transparent={false}
        presentationStyle="fullScreen"
        onRequestClose={() => setShowHistory(false)}
        statusBarTranslucent
      >
        <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.historyHeaderFull}>
            <View style={styles.historyHeaderLeft}>
              <Text style={styles.historyTitleFull}>Chat History</Text>
              {sessions.length > 0 && (
                <View style={styles.historyCountBadge}>
                  <Text style={styles.historyCountText}>{sessions.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowHistory(false)}>
              <X size={22} color="#0F172A" weight="bold" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={sessions}
            keyExtractor={s => s.id}
            contentContainerStyle={styles.historyList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const firstUserMsg = item.messages.find(m => m.role === 'user')?.content || 'New Chat';
              const lastModelMsg = [...item.messages].reverse().find(m => m.role === 'model')?.content
                ?.replace(/\[NOTE:[a-zA-Z0-9-]+\]/g, '')
                ?.replace(/[#*`_]/g, '')
                ?.trim();
              const isActive = item.id === currentSessionId;
              const dateObj = new Date(item.updatedAt);
              const isToday = new Date().toDateString() === dateObj.toDateString();
              const timeStr = isToday
                ? `Today, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              
              return (
                <View style={[styles.historyCard, isActive && styles.historyCardActive]}>
                  <TouchableOpacity
                    style={styles.historyCardContent}
                    onPress={() => handleLoadSession(item.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.historyIconWrap, isActive && styles.historyIconWrapActive]}>
                      <ChatTeardropText size={18} color={isActive ? '#0F172A' : '#64748B'} weight={isActive ? 'fill' : 'regular'} />
                    </View>
                    <View style={styles.historyCardTexts}>
                      <View style={styles.historyCardTitleRow}>
                        <Text style={[styles.historyCardTitle, isActive && styles.historyCardTitleActive]} numberOfLines={1}>
                          {firstUserMsg}
                        </Text>
                        {isActive && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>Active</Text>
                          </View>
                        )}
                      </View>
                      {!!lastModelMsg && (
                        <Text style={styles.historyCardSnippet} numberOfLines={1}>
                          {lastModelMsg}
                        </Text>
                      )}
                      <Text style={styles.historyCardTime}>{timeStr} • {item.messages.length} msg{item.messages.length === 1 ? '' : 's'}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.historyDeleteBtn}
                    onPress={() => handleDeleteSession(item.id)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Trash size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.historyEmptyState}>
                <View style={styles.historyEmptyIcon}>
                  <ChatTeardropText size={32} color="#94A3B8" />
                </View>
                <Text style={styles.historyEmptyTitle}>No Conversations Yet</Text>
                <Text style={styles.historyEmptyText}>When you chat with CramSnap Agent, your conversations will be saved here.</Text>
              </View>
            }
          />
          
          <View style={styles.historyBottomBar}>
            <TouchableOpacity style={styles.historyNewBtnFull} onPress={handleNewChat} activeOpacity={0.85}>
              <Plus size={18} color="#FFFFFF" weight="bold" />
              <Text style={styles.historyNewBtnTextFull}>Start New Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'AssistantBold', fontWeight: '700', color: '#0F172A', marginLeft: 44 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 68, height: 68, borderRadius: 16, marginBottom: 20 },
  emptyTitle: { fontSize: 23, fontFamily: 'AssistantBold', fontWeight: '700', color: '#0F172A', textAlign: 'center', lineHeight: 30 },
  emptySub: { fontSize: 14, fontFamily: 'Assistant', color: '#94A3B8', marginTop: 10, textAlign: 'center', lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  userRow: { alignItems: 'flex-end', marginBottom: 12 },
  userBubble: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: SCREEN_WIDTH * 0.78,
  },
  userText: { fontSize: 15, fontFamily: 'Assistant', color: '#0F172A', lineHeight: 21 },
  aiRow: { alignItems: 'flex-start', marginBottom: 16, paddingHorizontal: 16, maxWidth: '100%' },
  loadingRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'flex-start',
  },
  loadingTextSimple: {
    fontSize: 14,
    fontFamily: 'Assistant',
    color: '#94A3B8',
  },
  copyBtn: { marginTop: 4, alignSelf: 'flex-start' },
  noteCard: {
    width: SCREEN_WIDTH * 0.68,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  noteCardImg: { width: '100%', height: 170 },
  noteCardFooter: { paddingHorizontal: 12, paddingVertical: 8 },
  noteCardTitle: { fontSize: 13, fontFamily: 'AssistantBold', fontWeight: '600', color: '#374151' },
  noteMissing: { width: 160, height: 50, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginVertical: 8 },
  noteMissingText: { fontSize: 13, fontFamily: 'Assistant', color: '#94A3B8', fontStyle: 'italic' },
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    fontSize: 15,
    fontFamily: 'Assistant',
    color: '#0F172A',
    paddingTop: 7,
    paddingBottom: 7,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  historyHeaderFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyTitleFull: {
    fontSize: 20,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
  },
  historyCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  historyCountText: {
    fontSize: 12,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#64748B',
  },
  historyList: {
    padding: 16,
    gap: 10,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  historyCardActive: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  historyCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIconWrapActive: {
    backgroundColor: '#E2E8F0',
  },
  historyCardTexts: {
    flex: 1,
  },
  historyCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  historyCardTitle: {
    fontSize: 15,
    fontFamily: 'AssistantBold',
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  historyCardTitleActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  currentBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historyCardSnippet: {
    fontSize: 13,
    fontFamily: 'Assistant',
    color: '#64748B',
    marginBottom: 4,
  },
  historyCardTime: {
    fontSize: 11,
    fontFamily: 'Assistant',
    color: '#94A3B8',
  },
  historyDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  historyEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  historyEmptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyEmptyTitle: {
    fontSize: 18,
    fontFamily: 'AssistantBold',
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  historyEmptyText: {
    fontSize: 14,
    fontFamily: 'Assistant',
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  historyBottomBar: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  historyNewBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  historyNewBtnTextFull: {
    fontSize: 15,
    fontFamily: 'AssistantBold',
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mathContainer: {
    width: '100%',
    marginVertical: 4,
  },
});
