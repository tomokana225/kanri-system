import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc,
  onSnapshot,
  writeBatch,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { User, UserRole, Booking, BookingStatus, ScheduleSlot, Notification, Message } from '../types';

export const api = {
  // =================================
  // Auth
  // =================================
  async login(email: string, password: string): Promise<FirebaseUser> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  async logout(): Promise<void> {
    await signOut(auth);
  },

  async getUserProfile(uid: string): Promise<User | null> {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      // The document ID in 'users' collection is the uid from Firebase Auth
      return { uid, ...userDocSnap.data() } as User;
    }
    return null;
  },

  // =================================
  // Users
  // =================================
  async getUsers(): Promise<User[]> {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },

  async getUsersByRole(role: UserRole): Promise<User[]> {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, where('role', '==', role), orderBy('name'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  },
  
  // =================================
  // Bookings
  // =================================
  async getBookings(studentId?: string, teacherId?: string): Promise<Booking[]> {
    const bookingsCollectionRef = collection(db, 'bookings');
    const constraints = [];
    if (studentId) {
      constraints.push(where('studentId', '==', studentId));
    }
    if (teacherId) {
      constraints.push(where('teacherId', '==', teacherId));
    }
    constraints.push(orderBy('date', 'desc'));
    constraints.push(orderBy('time', 'asc'));

    const q = query(bookingsCollectionRef, ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
  },

  async createBooking(bookingData: Omit<Booking, 'id' | 'status' | 'studentName' | 'teacherName' | 'notes'>): Promise<Booking> {
    const batch = writeBatch(db);

    const scheduleCollectionRef = collection(db, 'schedule');
    const q = query(
      scheduleCollectionRef,
      where('teacherId', '==', bookingData.teacherId),
      where('date', '==', bookingData.date),
      where('time', '==', bookingData.time)
    );
    const scheduleSnapshot = await getDocs(q);
    if (scheduleSnapshot.empty) {
      throw new Error('No matching available schedule slot found.');
    }
    const slotDoc = scheduleSnapshot.docs[0];
    if (!slotDoc.data().isAvailable) {
        throw new Error('Slot is no longer available.');
    }
    
    batch.update(slotDoc.ref, { isAvailable: false });

    const studentProfile = await this.getUserProfile(bookingData.studentId);
    const teacherProfile = await this.getUserProfile(bookingData.teacherId);

    if (!studentProfile || !teacherProfile) {
        throw new Error('Student or teacher profile not found.');
    }

    const bookingsCollectionRef = collection(db, 'bookings');
    const newBookingData = {
      ...bookingData,
      studentName: studentProfile.name,
      teacherName: teacherProfile.name,
      status: BookingStatus.CONFIRMED,
    };
    const bookingDocRef = doc(bookingsCollectionRef); 
    batch.set(bookingDocRef, newBookingData);
    
    await batch.commit();

    return { id: bookingDocRef.id, ...newBookingData } as Booking;
  },

  async cancelBooking(bookingId: string): Promise<Booking> {
    const batch = writeBatch(db);
    const bookingDocRef = doc(db, 'bookings', bookingId);
    
    const bookingDoc = await getDoc(bookingDocRef);
    if (!bookingDoc.exists()) {
        throw new Error('Booking not found.');
    }
    const bookingData = bookingDoc.data() as Booking;

    batch.update(bookingDocRef, { status: BookingStatus.CANCELED });

    const scheduleCollectionRef = collection(db, 'schedule');
    const q = query(
      scheduleCollectionRef,
      where('teacherId', '==', bookingData.teacherId),
      where('date', '==', bookingData.date),
      where('time', '==', bookingData.time)
    );
    const scheduleSnapshot = await getDocs(q);
    if (!scheduleSnapshot.empty) {
      const slotDoc = scheduleSnapshot.docs[0];
      batch.update(slotDoc.ref, { isAvailable: true });
    }

    await batch.commit();

    return { ...bookingData, id: bookingId, status: BookingStatus.CANCELED };
  },

  // =================================
  // Schedule
  // =================================
  async getScheduleForTeacher(teacherId: string): Promise<ScheduleSlot[]> {
    const scheduleCollectionRef = collection(db, 'schedule');
    const q = query(scheduleCollectionRef, where('teacherId', '==', teacherId), orderBy('date'), orderBy('time'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleSlot));
  },

  async createScheduleSlots(slots: Omit<ScheduleSlot, 'id' | 'isAvailable'>[]): Promise<void> {
    const batch = writeBatch(db);
    const scheduleCollectionRef = collection(db, 'schedule');
    slots.forEach(slot => {
        const newSlotDocRef = doc(scheduleCollectionRef);
        batch.set(newSlotDocRef, { ...slot, isAvailable: true });
    });
    await batch.commit();
  },

  // =================================
  // Notifications
  // =================================
  getNotifications(userId: string, callback: (notifications: Notification[]) => void): () => void {
    const notificationsCollectionRef = collection(db, 'notifications');
    const q = query(
      notificationsCollectionRef, 
      where('userId', '==', userId), 
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      callback(notifications);
    });

    return unsubscribe;
  },

  async sendNotification(notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Promise<Notification> {
    const notificationsCollectionRef = collection(db, 'notifications');
    const newNotificationData = {
        ...notificationData,
        isRead: false,
        createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(notificationsCollectionRef, newNotificationData);
    const savedData = (await getDoc(docRef)).data();
    return { id: docRef.id, ...savedData } as unknown as Notification;
  },

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const batch = writeBatch(db);
    const notificationsCollectionRef = collection(db, 'notifications');
    const q = query(
      notificationsCollectionRef,
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true });
    });
    await batch.commit();
  },

  // =================================
  // Messaging
  // =================================
  async getRecentConversations(userId: string): Promise<{ user: User; lastMessage: Message }[]> {
    const messagesCollectionRef = collection(db, 'messages');
    
    const sentQuery = query(
        messagesCollectionRef, 
        where('senderId', '==', userId)
    );
    const receivedQuery = query(
        messagesCollectionRef,
        where('recipientId', '==', userId)
    );
    
    const [sentSnapshot, receivedSnapshot] = await Promise.all([
        getDocs(sentQuery),
        getDocs(receivedQuery)
    ]);

    const allMessages = [
        ...sentSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Message)),
        ...receivedSnapshot.docs.map(d => ({id: d.id, ...d.data()} as Message)),
    ];
    
    allMessages.sort((a,b) => b.createdAt.seconds - a.createdAt.seconds);

    const conversationsMap = new Map<string, Message>();
    
    for (const msg of allMessages) {
        const otherUserId = msg.senderId === userId ? msg.recipientId : msg.senderId;
        if (!conversationsMap.has(otherUserId)) {
            conversationsMap.set(otherUserId, msg);
        }
    }

    const conversationDataPromises = Array.from(conversationsMap.entries()).map(async ([otherUserId, lastMessage]) => {
        const userProfile = await this.getUserProfile(otherUserId);
        if (userProfile) {
            return { user: userProfile, lastMessage };
        }
        return null;
    });

    const conversationData = (await Promise.all(conversationDataPromises)).filter(Boolean) as { user: User; lastMessage: Message }[];

    conversationData.sort((a, b) => b.lastMessage.createdAt.seconds - a.lastMessage.createdAt.seconds);
    
    return conversationData;
  },

  getMessages(userId1: string, userId2: string, callback: (messages: Message[]) => void): () => void {
    const conversationId = [userId1, userId2].sort().join('_');
    const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        callback(messages);
    });
    
    return unsubscribe;
  },
  
  async sendMessage(messageData: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Promise<Message> {
    const messagesCollectionRef = collection(db, 'messages');
    const conversationId = [messageData.senderId, messageData.recipientId].sort().join('_');
    
    const newMessageData = {
        ...messageData,
        isRead: false,
        createdAt: Timestamp.now(),
        conversationId,
    };
    
    const docRef = await addDoc(messagesCollectionRef, newMessageData);
    const savedData = (await getDoc(docRef)).data();
    return { id: docRef.id, ...savedData } as unknown as Message;
  },
};
