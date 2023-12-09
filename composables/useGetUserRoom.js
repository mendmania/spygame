export default function useGetUserRoom() {
    const userRoomId = localStorage.getItem('spyroom')
    return userRoomId
}