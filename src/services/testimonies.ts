import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';

export interface Testimony {
  id: string;
  name: string;
  description: string;
  imageSrc: string;
  hint: string;
}

export type NewTestimony = Omit<Testimony, 'id'>;

export async function addTestimony(testimony: NewTestimony): Promise<void> {
  try {
    const testimoniesCol = collection(db, 'testimonies');
    // The `name` field is added to the testimony document.
    // We can also add an `orderBy` clause to sort testimonies by name.
    await addDoc(testimoniesCol, {
        ...testimony,
        // you might want to add a server timestamp here in a real app
    });
  } catch (error: any) {
    console.error("Error adding testimony: ", error);
    throw new Error(`Failed to add testimony. Please check security rules and network connection. Original error: ${error.code || error.message}`);
  }
}


export async function getTestimonies(): Promise<Testimony[]> {
  try {
    const testimoniesCol = collection(db, 'testimonies');
    // Optional: order by name, you can change this to a timestamp field later
    const q = query(testimoniesCol, orderBy('name')); 
    const testimonySnapshot = await getDocs(q);
    
    if (testimonySnapshot.empty) {
        console.log('No matching documents in "testimonies" collection.');
        return [];
    }

    const testimonyList = testimonySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Testimony));

    return testimonyList;
  } catch (error: any) {
    console.error("Error fetching testimonies: ", error);
    // Re-throw the error with a more descriptive message to be caught by the UI component
    throw new Error(`Failed to fetch testimonies. Please check security rules and network connection. Original error: ${error.code || error.message}`);
  }
}
