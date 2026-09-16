import { getCategories, saveCategory, updateNote, getNote } from '@/services/notes';
import { chatWithAI } from '@/services/openrouter';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const getRandomColor = () => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
};

export const processNote = async (noteId: string, imageUri: string) => {
    try {
        console.log(`Starting processing for note ${noteId}`);
        let base64 = '';
        if (Platform.OS === 'web') {
            const response = await fetch(imageUri);
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
            base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
        }

        const categories = await getCategories();
        const categoriesContext = categories.map(c => `- ${c.name}: ${c.description || 'No description'}`).join('\n');

        const prompt = `
You are CramSnap, an intelligent AI that analyzes captured whiteboard notes, documents, and slides for college students.

Your tasks:
1. **Analyze the content** and generate a concise title and a short description.
2. **Perform AI Extraction**: Extract the full key points, formulas, or text and format beautifully in Markdown.
3. **Generate Tags**: Provide an array of string tags relevant to the subject.
4. **Categorize the note**: Evaluate the content against the user's existing categories. If it fits, use the exact name. If it doesn't fit well, create a new relevant category name.

User's Existing Categories:
${categoriesContext || 'No existing categories. Create a new one.'}

Return STRICT JSON matching this schema:
{
  "title": "Short title",
  "description": "Brief 1-2 sentence description",
  "ai_extraction": "Detailed markdown content",
  "tags": ["tag1", "tag2"],
  "category": {
    "name": "Category Name",
    "description": "Category Description"
  }
}
`;

        const responseText = await chatWithAI(prompt, base64);
        console.log("OpenRouter Response:", responseText);

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
            content: error?.message || 'Note saved without AI analysis. Enter your OpenRouter API key in Profile settings to enable AI transcription.'
        });
    }
};
