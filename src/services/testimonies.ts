import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export interface Testimony {
  id: string;
  name: string;
  description: string;
  imageSrc: string;
  hint: string;
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
  } catch (error) {
    console.error("Error fetching testimonies: ", error);
    // In a real app, you might want to handle this error more gracefully
    throw new Error("Failed to fetch testimonies from Firestore.");
  }
}
