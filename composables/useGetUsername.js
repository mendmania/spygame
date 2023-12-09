

export default function useGetUsername() {
    const username = localStorage.getItem('spyusername')
    return username
}