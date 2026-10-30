import type { SpaceType } from '@/lib/pricing'

export interface CountryCode {
  code: string
  flag: string
  name: string
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+57', flag: '🇨🇴', name: 'Colombia (+57)' },
  { code: '+1', flag: '🇺🇸', name: 'EE. UU. / Canadá (+1)' },
  { code: '+34', flag: '🇪🇸', name: 'España (+34)' },
  { code: '+52', flag: '🇲🇽', name: 'México (+52)' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina (+54)' },
  { code: '+56', flag: '🇨🇱', name: 'Chile (+56)' },
  { code: '+51', flag: '🇵🇪', name: 'Perú (+51)' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador (+593)' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela (+58)' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá (+507)' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil (+55)' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido (+44)' },
  { code: '+49', flag: '🇩🇪', name: 'Alemania (+49)' },
  { code: '+33', flag: '🇫🇷', name: 'Francia (+33)' },
]

export interface ProfileData {
  firstName: string
  lastName: string
  phoneCountryCode: string
  phone: string
  email: string
  city: string
  neighbourhood: string
}

export interface DogData {
  enrollDog: boolean | null
  name: string
  breed: string
  birthday: string
  weightKg: string
  sex: 'female' | 'male' | ''
  neutered: 'yes' | 'no' | ''
  energy: number | null
  goodWithDogs: 'yes' | 'unsure' | 'no'
  goodWithCats: 'yes' | 'unsure' | 'no'
  goodWithKids: 'yes' | 'unsure' | 'no'
  routineNotes: string
}

export interface HostData {
  wantsToHost: boolean | null
  space: SpaceType
  areaM2: string
  otherPets: string
  acceptsSmallDogs: boolean
  acceptsMediumDogs: boolean
  acceptsLargeDogs: boolean
  acceptsCats: boolean
  acceptsPuppies: boolean
  acceptsSeniors: boolean
  maxGuests: number
  priceAdjustPct: number
  earliestDropoff: string
  latestPickup: string
}

export interface AmenityItem {
  id: string
  label_es: string
  add_per_hour_cop: number
}
