import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export async function uploadTestimonyImage(imageFile: File): Promise<string> {
  if (!imageFile) {
    throw new Error("No image file provided.");
  }
  const fileExtension = imageFile.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const storageRef = ref(storage, `testimonies/${fileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, imageFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error("Error uploading image: ", error);
    if (error.code === 'storage/unauthorized') {
      throw new Error("Image upload failed: Permission denied. Please check your Firebase Storage security rules.");
    }
    throw new Error(`Failed to upload image. Error: ${error.code || error.message}`);
  }
}
