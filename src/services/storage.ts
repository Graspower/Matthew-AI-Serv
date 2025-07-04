import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

function checkStorage() {
    if (!storage) {
        throw new Error("Firebase is not configured. Please check your .env.local file and restart the server.");
    }
    return storage as FirebaseStorage;
}

export async function uploadTestimonyImage(imageFile: File): Promise<string> {
  if (!imageFile) {
    throw new Error("No image file provided.");
  }
  const fileExtension = imageFile.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const firebaseStorage = checkStorage();
  const storageRef = ref(firebaseStorage, `testimonies/${fileName}`);

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
