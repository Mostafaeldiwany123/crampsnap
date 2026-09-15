import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

export const compressImage = async (uri: string, compress = 0.5, width = 1024) => {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width } }],
            { compress: compress, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        return manipResult;
    } catch (error) {
        console.error("Error compressing image:", error);
        throw error;
    }
};
