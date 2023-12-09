export const generateRoomId = () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let roomId = '';

    for (let i = 0; i < 4; i++) {
        const randomIndex = Math.floor(Math.random() * alphabet.length);
        roomId += alphabet.charAt(randomIndex);
    }

    return roomId;
}
