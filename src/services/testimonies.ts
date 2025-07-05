
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion, increment, Timestamp, query, where, Firestore } from 'firebase/firestore';

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
  category: string;
  comments: Comment[];
  reactions: Reactions;
  userId: string;
}

export type NewTestimony = Omit<Testimony, 'id' | 'comments' | 'reactions' | 'userId'>;

function checkDb() {
    if (!db) {
        throw new Error("Firebase is not configured. Please check your .env.local file and restart the server.");
    }
    return db as Firestore;
}

export async function addTestimony(testimony: NewTestimony, userId: string): Promise<void> {
  try {
    const firestore = checkDb();
    const testimoniesCol = collection(firestore, 'testimonies');
    await addDoc(testimoniesCol, {
        ...testimony,
        userId,
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
  try {
    const firestore = checkDb();
    const testimonyRef = doc(firestore, 'testimonies', testimonyId);
    const firestoreComment = {
      ...comment,
      createdAt: Timestamp.fromDate(new Date(comment.createdAt)),
    };
    await updateDoc(testimonyRef, {
      comments: arrayUnion(firestoreComment)
    });
  } catch (error: any) {
    console.error("Error adding comment: ", error);
    if (error.code === 'permission-denied') {
      throw new Error("Failed to add comment: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add comment. Please check your connection. Original error: ${error.code || error.message}`);
  }
}

export async function addReactionToTestimony(testimonyId: string, reactionType: keyof Reactions): Promise<void> {
  try {
    const firestore = checkDb();
    const testimonyRef = doc(firestore, 'testimonies', testimonyId);
    const fieldToIncrement = `reactions.${reactionType}`;
    await updateDoc(testimonyRef, {
        [fieldToIncrement]: increment(1)
    });
  } catch (error: any)
  {
    console.error("Error adding reaction: ", error);
    if (error.code === 'permission-denied') {
      throw new Error("Failed to add reaction: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add reaction. Please check your connection. Original error: ${error.code || error.message}`);
  }
}

export async function getTestimonies(userId: string): Promise<Testimony[]> {
  try {
    const firestore = checkDb();
    const testimoniesCol = collection(firestore, 'testimonies');
    const q = query(testimoniesCol, where("userId", "==", userId));
    const testimonySnapshot = await getDocs(q);
    
    if (testimonySnapshot.empty) {
        console.log('No matching documents in "testimonies" collection for this user.');
        return [];
    }

    const testimonyList = testimonySnapshot.docs.map(doc => {
      const data = doc.data();
      const comments = (data.comments || []).map((c: any) => ({
        ...c,
        createdAt: c.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      }));

      return {
        id: doc.id,
        name: data.name || 'Anonymous',
        description: data.description || '',
        category: data.category || 'Testimony',
        reactions: data.reactions || { like: 0, pray: 0, claps: 0, downlike: 0 },
        comments: comments,
        userId: data.userId,
      } as Testimony;
    });

    return testimonyList.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error("Error fetching testimonies: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Permission Denied: Your security rules are not set up to allow reading testimonies. Please update your Firestore rules to allow 'read' access to the 'testimonies' collection for authenticated users.");
    }
    throw new Error(`Failed to fetch testimonies. Please check your network connection. Original error: ${error.code || error.message}`);
  }
}
