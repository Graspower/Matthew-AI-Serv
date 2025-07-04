
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, arrayUnion, increment, Timestamp } from 'firebase/firestore';
import type { Comment, Reactions } from './testimonies'; // Reuse comment/reaction types

export interface Teaching {
  id: string;
  name: string;
  description: string;
  category: string;
  comments: Comment[];
  reactions: Reactions;
}

export type NewTeaching = Omit<Teaching, 'id' | 'comments' | 'reactions'>;

export async function addTeaching(teaching: NewTeaching): Promise<void> {
  try {
    const teachingsCol = collection(db, 'Teachings');
    await addDoc(teachingsCol, {
        ...teaching,
        comments: [],
        reactions: { like: 0, pray: 0, claps: 0, downlike: 0 },
        createdAt: Timestamp.now(),
    });
  } catch (error: any) {
    console.error("Error adding teaching: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Failed to add teaching: Permission denied. Please check your Firestore security rules.");
    }
    throw new Error(`Failed to add teaching. Please check security rules and network connection. Original error: ${error.code || error.message}`);
  }
}

export async function addCommentToTeaching(teachingId: string, comment: Comment): Promise<void> {
  try {
    const teachingRef = doc(db, 'Teachings', teachingId);
    const firestoreComment = {
      ...comment,
      createdAt: Timestamp.fromDate(new Date(comment.createdAt)),
    };
    await updateDoc(teachingRef, {
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

export async function addReactionToTeaching(teachingId: string, reactionType: keyof Reactions): Promise<void> {
  try {
    const teachingRef = doc(db, 'Teachings', teachingId);
    const fieldToIncrement = `reactions.${reactionType}`;
    await updateDoc(teachingRef, {
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

export async function getTeachings(): Promise<Teaching[]> {
  try {
    const teachingsCol = collection(db, 'Teachings');
    const teachingSnapshot = await getDocs(teachingsCol);
    
    if (teachingSnapshot.empty) {
        console.log('No matching documents in "Teaching" collection.');
        return [];
    }

    const teachingList = teachingSnapshot.docs.map(doc => {
      const data = doc.data();
      const comments = (data.comments || []).map((c: any) => ({
        ...c,
        createdAt: c.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
      }));

      return {
        id: doc.id,
        name: data.name || 'Anonymous',
        description: data.description || '',
        category: data.category || 'Teaching',
        reactions: data.reactions || { like: 0, pray: 0, claps: 0, downlike: 0 },
        comments: comments,
      } as Teaching;
    });

    return teachingList.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error("Error fetching teachings: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("Permission Denied: Your security rules are not set up to allow reading teachings. Please update your Firestore rules to allow 'read' access to the 'Teaching' collection.");
    }
    throw new Error(`Failed to fetch teachings. Please check your network connection. Original error: ${error.code || error.message}`);
  }
}
