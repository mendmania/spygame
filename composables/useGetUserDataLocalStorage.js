export default function useGetUserDataLocalStorage() {
    const spyUserData = JSON.parse(localStorage.getItem('spyData'))
    return spyUserData
}