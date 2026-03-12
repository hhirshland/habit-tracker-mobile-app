import * as Contacts from 'expo-contacts';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THRIVE_PHONE_NUMBER = '+17814861020';
const STORAGE_KEY = 'thrive_contact_saved';

export async function hasSavedThriveContact(): Promise<boolean> {
  return (await AsyncStorage.getItem(STORAGE_KEY)) === 'true';
}

export async function saveThriveContact(): Promise<boolean> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') return false;

  const asset = Asset.fromModule(require('../assets/images/icon.png'));
  await asset.downloadAsync();

  const contact: Contacts.Contact = {
    contactType: Contacts.ContactTypes.Company,
    company: 'Thrive',
    name: 'Thrive',
    phoneNumbers: [{ number: THRIVE_PHONE_NUMBER, label: 'main' }],
    image: asset.localUri ? { uri: asset.localUri } : undefined,
  };

  await Contacts.addContactAsync(contact);
  await AsyncStorage.setItem(STORAGE_KEY, 'true');
  return true;
}
