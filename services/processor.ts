import { getCategories, saveCategory, updateNote, getNote } from '@/services/notes';
import { chatWithAI } from '@/services/googleai';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

const getRandomColor = () => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
};

const AI_IMAGE_MAX_WIDTH = 1600;
const AI_IMAGE_COMPRESSION = 0.8;

/**
 * Downscales + compresses a captured photo before sending it to the AI.
 * Full-res phone photos are 2-6 MB of base64; resizing cuts the payload
 * dramatically, which directly reduces Gemini latency (~5-8s to ~3-5s).
 */
const prepareImageForAI = async (uri: string): Promise<string> => {
    const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: AI_IMAGE_MAX_WIDTH } }],
        {
            compress: AI_IMAGE_COMPRESSION,
            format: ImageManipulator.SaveFormat.JPEG,
        }
    );
    return resized.uri;
};

export const processNote = async (noteId: string, imageUri: string) => {
    try {
        console.log(`Starting processing for note ${noteId}`);

        // Resize image for faster AI analysis; fall back to original if it fails.
        let resizedUri = imageUri;
        try {
            resizedUri = await prepareImageForAI(imageUri);
        } catch (err) {
            console.warn('Image resize failed, using original:', err);
        }

        let base64 = '';
        if (Platform.OS === 'web') {
            const response = await fetch(resizedUri);
            const blob = await response.blob();
            base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    resolve(base64String.split(',')[1]);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } else {
            base64 = await FileSystem.readAsStringAsync(resizedUri, { encoding: 'base64' });
        }

        const categories = await getCategories();
        const categoriesContext = categories.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n');

        const prompt = `
You are an intelligent note extractor for college students.
Tasks:
1. Provide a short, clear title (e.g. "Newton's Laws of Motion") and 1-sentence description.
2. Extract all notes, math, and key points in beautiful Markdown with headers, bullet points, and code blocks where appropriate.
3. Provide 3-5 relevant lowercase tags as strings (e.g. "calculus", "derivatives").
4. Categorize the note. IMPORTANT category naming rules:
   - Use 2-4 descriptive words for the subject area (e.g. "Organic Chemistry", "Linear Algebra", "Data Structures", "World War II History").
   - NEVER use a single generic word like "Math", "Science", or "History" alone.
   - If content matches an existing category name EXACTLY, reuse it. Otherwise create a new descriptive one.
   Existing categories: ${categoriesContext || 'None — create a descriptive new category.'}
Output instantly without any reasoning or thinking tokens.
`;

        const schema = {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            ai_extraction: { type: "STRING" },
            tags: { type: "ARRAY", items: { type: "STRING" } },
            category: { 
              type: "OBJECT", 
              properties: { 
                name: { type: "STRING" }, 
                description: { type: "STRING" } 
              },
              required: ["name", "description"]
            }
          },
          required: ["title", "description", "ai_extraction", "tags", "category"]
        };

        const responseText = await chatWithAI(prompt, base64, schema);
        console.log("Google AI Studio Response:", responseText);

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in response");
        const data = JSON.parse(jsonMatch[0]);

        // Handle Category logic
        let categoryId;
        const categoryName = data.category.name.trim();

        // Check if category exists (case-insensitive)
        const existingCategory = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());

        if (existingCategory) {
            categoryId = existingCategory.id;
        } else {
            // Create new category
            const newCat = await saveCategory({
                name: categoryName,
                description: data.category.description || 'Auto-generated category',
                color: getRandomColor(),
            });
            categoryId = newCat.id;
        }
        
        // Update Note with results
        await updateNote(noteId, {
            title: data.title || 'Captured Note',
            content: data.ai_extraction || '', 
            summary: data.description || '',
            tags: data.tags || [],
            category_id: categoryId,
            status: 'completed'
        });

        console.log(`Note ${noteId} processed successfully.`);

    } catch (error: any) {
        console.error("Error processing note:", error);
        await updateNote(noteId, {
            status: 'completed',
            content: error?.message || 'Note saved without AI analysis. Enter your Google AI Studio API key in Profile settings to enable AI transcription.'
        });
    }
};
