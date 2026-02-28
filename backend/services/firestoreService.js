const { db } = require('../config/firestore');

const COLLECTIONS = {
  users: 'users',
  wards: 'wards',
  reports: 'wasteReports',
  policies: 'policyRecommendations'
};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
};

const docToData = (doc) => ({ id: doc.id, ...doc.data() });

const getCollection = (name) => db.collection(name);

const getById = async (collectionName, id) => {
  const doc = await getCollection(collectionName).doc(id).get();
  return doc.exists ? docToData(doc) : null;
};

const getAll = async (collectionName) => {
  const snapshot = await getCollection(collectionName).get();
  return snapshot.docs.map(docToData);
};

const createDoc = async (collectionName, data, id = null) => {
  if (id) {
    await getCollection(collectionName).doc(id).set(data);
    return getById(collectionName, id);
  }

  const ref = await getCollection(collectionName).add(data);
  return getById(collectionName, ref.id);
};

const updateDoc = async (collectionName, id, data) => {
  await getCollection(collectionName).doc(id).set(data, { merge: true });
  return getById(collectionName, id);
};

const deleteDoc = async (collectionName, id) => {
  await getCollection(collectionName).doc(id).delete();
};

module.exports = {
  COLLECTIONS,
  toDate,
  getById,
  getAll,
  createDoc,
  updateDoc,
  deleteDoc
};
