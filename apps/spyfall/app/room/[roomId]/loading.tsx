import { Card, CardContent } from '@vbz/ui';

export default function RoomLoading() {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4" />
            <p className="text-gray-400">Loading room...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
