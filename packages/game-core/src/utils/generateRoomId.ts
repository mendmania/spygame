const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomId(length: number = 6): string {
  let result = '';
  const charactersLength = CHARACTERS.length;

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += CHARACTERS[randomIndex];
  }

  return result;
}
