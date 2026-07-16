import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useProfileStore = create(
  persist(
    (set) => ({
      /* ── Identity (universal) ────────────────────────── */
      fullName: '',
      avatarInitials: '',
      email: '',
      role: 'Student',              // Student | Faculty | Staff | Alumni | Other
      organization: '',
      department: '',

      /* ── Student-specific (shown when role=Student) ──── */
      idNumber: '',
      program: '',
      yearLevel: '',
      currentTerm: '',

      /* ── Faculty/Staff-specific ──────────────────────── */
      position: '',                 // e.g. "Instructor I", "Lab Technician"

      /* ── Alumni-specific (shown when role=Alumni) ────── */
      previousProgram: '',          // e.g. "BS Computer Science"
      graduationYear: '',           // e.g. "2023"
      currentAffiliation: '',       // e.g. "Accenture Philippines"

      /* ── Shared ──────────────────────────────────────── */
      supervisor: '',

      updateProfile: (patch) => set((s) => ({ ...s, ...patch })),
    }),
    { name: 'campus-chronicle-profile' }
  )
)

export default useProfileStore
