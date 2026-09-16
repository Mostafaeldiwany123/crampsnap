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
Analyze the attached image. It might be a whiteboard, a document, or a slide.

Your tasks:
1. **Analyze the content** and generate a concise summary/title.
2. **Categorize the note**. 
   - Existing categories:
${categoriesContext}
3. **Detail the content**. Extract key points and format as Markdown.

Return STRICT JSON:
{
  "summary": "Title",
  "content": "Detailed markdown",
  "category": {
    "name": "Category Name",
    "description": "Category Description",
    "isNew": boolean
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
            title: data.summary,
            content: data.content || data.summary, // Fallback
            summary: data.summary,
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
