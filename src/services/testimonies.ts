
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string; // ISO string format
}

export interface Reactions {
  like: number;
  pray: number;
  claps: number;
  downlike: number;
}

export interface Testimony {
  id: string;
  name: string;
  description: string;
  hint: string;
  comments: Comment[];
  reactions: Reactions;
}

export type NewTestimony = Omit<Testimony, 'id' | 'comments' | 'reactions'>;

export async function addTestimony(testimony: NewTestimony): Promise<void> {
  try {
    const testimoniesCol = collection(db, 'testimonies');
    await addDoc(testimoniesCol, {
        ...testimony,
        comments: [],
        reactions: { like: 0, pray: 0, claps: 0, downlike: 0 },
        createdAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error("Error adding testimony: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Failed to add testimony: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add testimony. Please check security rules and network connection. Original error: ${error.code || error.message}`);
  }
}

export async function addCommentToTestimony(testimonyId: string, comment: Comment): Promise<void> {
  const testimonyRef = doc(db, 'testimonies', testimonyId);
  const firestoreComment = {
    ...comment,
    createdAt: Timestamp.fromDate(new Date(comment.createdAt)),
  };
  await updateDoc(testimonyRef, {
    comments: arrayUnion(firestoreComment)
  });
}

export async function addReactionToTestimony(testimonyId: string, reactionType: keyof Reactions): Promise<void> {
    const testimonyRef = doc(db, 'testimonies', testimonyId);
    const fieldToIncrement = `reactions.${reactionType}`;
    await updateDoc(testimonyRef, {
        [fieldToIncrement]: increment(1)
    });
}

export async function getTestimonies(): Promise<Testimony[]> {
  try {
    const testimoniesCol = collection(db, 'testimonies');
    const testimonySnapshot = await getDocs(testimoniesCol);
    
    if (testimonySnapshot.empty) {
        console.log('No matching documents in "testimonies" collection.');
        return [];
    }

    const testimonyList = testimonySnapshot.docs.map(doc => {
      const data = doc.data();
      // Convert Firestore Timestamps in comments to ISO strings for client-side use
      const comments = (data.comments || []).map((c: any) => ({
        ...c,
        createdAt: c.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      }));

      return {
        id: doc.id,
        name: data.name || 'Anonymous',
        description: data.description || '',
        hint: data.hint || 'Testimony',
        reactions: data.reactions || { like: 0, pray: 0, claps: 0, downlike: 0 },
        comments: comments,
      } as Testimony;
    });

    // Sort the results on the client side after fetching.
    return testimonyList.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error("Error fetching testimonies: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Permission Denied: Your security rules are not set up to allow reading testimonies. Please update your Firestore rules to allow 'read' access to the 'testimonies' collection.");
    }
    throw new Error(`Failed to fetch testimonies. Please check your network connection. Original error: ${error.code || error.message}`);
  }
}
