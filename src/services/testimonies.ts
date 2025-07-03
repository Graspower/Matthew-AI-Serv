
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

export interface Testimony {
  id: string;
  name: string;
  description: string;
  hint: string;
}

export type NewTestimony = Omit<Testimony, 'id'>;

export async function addTestimony(testimony: NewTestimony): Promise<void> {
  try {
    const testimoniesCol = collection(db, 'testimonies');
    await addDoc(testimoniesCol, {
        ...testimony,
        // you might want to add a server timestamp here in a real app
    });
  } catch (error: any) {
    console.error("Error adding testimony: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Failed to add testimony: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add testimony. Please check security rules and network connection. Original error: ${error.code || error.message}`);
  }
}


export async function getTestimonies(): Promise<Testimony[]> {
  try {
    const testimoniesCol = collection(db, 'testimonies');
    // We fetch without server-side sorting to avoid needing a specific Firestore index for now.
    const testimonySnapshot = await getDocs(testimoniesCol);
    
    if (testimonySnapshot.empty) {
        console.log('No matching documents in "testimonies" collection.');
        return [];
    }

    const testimonyList = testimonySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Testimony));

    // Sort the results on the client side after fetching.
    return testimonyList.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error("Error fetching testimonies: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Permission Denied: Your security rules are not set up to allow reading testimonies. Please update your Firestore rules to allow 'read' access to the 'testimonies' collection.");
    }
    // Re-throw the error with a more descriptive message to be caught by the UI component
    throw new Error(`Failed to fetch testimonies. Please check your network connection. Original error: ${error.code || error.message}`);
  }
}
