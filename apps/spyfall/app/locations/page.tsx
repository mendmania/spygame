import { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, WebPageSchema } from '@vbz/ui';
import { SPY_LOCATIONS } from '../../constants/locations';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://spyfall.virtualboardzone.com';
const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://virtualboardzone.com';

export const metadata: Metadata = {
  title: 'Spyfall Locations List - All Secret Locations & Roles',
  description: 'Complete list of all Spyfall locations and roles. Explore 40+ locations from Airport to Zoo, each with unique roles. Perfect for learning the game!',
  keywords: [
    'spyfall locations',
    'spyfall location list',
    'spyfall roles',
    'spyfall all locations',
    'spyfall places',
    'spy game locations',
    'spyfall cheat sheet',
  ],
  openGraph: {
    title: 'Spyfall Locations - Complete List of All Locations & Roles',
    description: 'Browse all Spyfall locations and their roles. 40+ locations to master!',
    url: `${baseUrl}/locations`,
    type: 'article',
  },
  alternates: {
    canonical: `${baseUrl}/locations`,
  },
};

// Group locations by category for better organization
const locationCategories = {
  'Entertainment & Leisure': [
    'Cinema', 'Theater', 'Art Gallery', 'Museum', 'Zoo', 'Aquarium', 
    'Beach Resort', 'Spa', 'Cruise Ship', 'Sports Stadium'
  ],
  'Food & Dining': [
    'Restaurant', 'Coffee Shop', 'Bakery', 'Grocery Store'
  ],
  'Healthcare': [
    'Hospital', 'Pharmacy', 'Dentist\'s Office'
  ],
  'Education': [
    'School', 'University', 'Library'
  ],
  'Professional Services': [
    'Office Building', 'Law Firm', 'Bank', 'Tech Startup'
  ],
  'Transportation': [
    'Airport', 'Shipping Port'
  ],
  'Emergency Services': [
    'Police Station', 'Fire Station'
  ],
  'Retail & Shopping': [
    'Fashion Boutique', 'Bookstore', 'Pet Store', 'Car Dealership'
  ],
  'Hospitality': [
    'Hotel'
  ],
  'Industrial': [
    'Factory', 'Construction Site', 'Garage'
  ],
  'Agriculture': [
    'Farm'
  ],
  'Creative': [
    'Music Studio', 'Art Studio', 'TV Studio'
  ],
  'Fitness': [
    'Gym'
  ],
};

export default function LocationsPage() {
  return (
    <>
      {/* Schema Markup */}
      <BreadcrumbSchema
        items={[
          { name: 'Virtual Board Zone', url: hubUrl },
          { name: 'Spyfall', url: baseUrl },
          { name: 'Locations', url: `${baseUrl}/locations` },
        ]}
      />
      <WebPageSchema
        name="Spyfall Locations - Complete Location List"
        description="Complete list of all Spyfall locations and roles for the online social deduction game."
        url={`${baseUrl}/locations`}
        author={{ name: 'Virtual Board Zone', url: hubUrl }}
      />

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2">
            <li>
              <Link href={hubUrl} className="text-blue-400 hover:text-blue-300">
                Home
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link href="/" className="text-blue-400 hover:text-blue-300">
                Spyfall
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li className="text-gray-400">Locations</li>
          </ol>
        </nav>

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Spyfall Locations
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Explore all {SPY_LOCATIONS.length} secret locations in Spyfall. 
            Each location has unique roles that players can be assigned.
          </p>
        </header>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{SPY_LOCATIONS.length}</div>
            <div className="text-sm text-gray-400">Total Locations</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-green-400">
              {SPY_LOCATIONS.reduce((sum, loc) => sum + loc.roles.length, 0)}
            </div>
            <div className="text-sm text-gray-400">Unique Roles</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">
              {Object.keys(locationCategories).length}
            </div>
            <div className="text-sm text-gray-400">Categories</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">FREE</div>
            <div className="text-sm text-gray-400">All Included</div>
          </div>
        </div>

        {/* Play CTA */}
        <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-6 mb-12 text-center">
          <p className="text-lg mb-4">Ready to test your spy skills?</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Play Spyfall Free
          </Link>
        </div>

        {/* All Locations Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">All Locations A-Z</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPY_LOCATIONS.sort((a, b) => a.name.localeCompare(b.name)).map((location) => (
              <article
                key={location.name}
                className="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-800/70 transition-colors"
              >
                <h3 className="font-semibold text-lg mb-2 text-blue-300">
                  📍 {location.name}
                </h3>
                <div className="text-sm text-gray-400">
                  <span className="font-medium text-gray-300">Roles:</span>{' '}
                  {location.roles.join(', ')}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Categories Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Locations by Category</h2>
          <div className="space-y-6">
            {Object.entries(locationCategories).map(([category, locationNames]) => {
              const categoryLocations = SPY_LOCATIONS.filter(loc => 
                locationNames.includes(loc.name)
              );
              
              if (categoryLocations.length === 0) return null;
              
              return (
                <div key={category} className="bg-gray-800/30 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-200">
                    {category}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({categoryLocations.length} locations)
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryLocations.map((location) => (
                      <div
                        key={location.name}
                        className="bg-gray-900/50 rounded-lg p-3"
                      >
                        <div className="font-medium text-blue-300">{location.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {location.roles.length} roles
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tips Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Location Strategy Tips</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-green-400">
                🔍 For Non-Spies
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Memorize common roles for each location</li>
                <li>• Ask about activities specific to the location</li>
                <li>• Use role-specific questions to test others</li>
                <li>• Pay attention to answers that seem too generic</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-red-400">
                🕵️ For Spies
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>• Learn which roles appear in multiple locations</li>
                <li>• Give answers that could apply to many places</li>
                <li>• Listen for location-specific details in questions</li>
                <li>• Use the locations list to narrow down possibilities</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Custom Categories CTA */}
        <section className="text-center bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-8 mb-12">
          <h2 className="text-2xl font-bold mb-4">Want Custom Locations?</h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Create your own custom categories with personalized locations and roles. 
            Perfect for themed parties, team building, or just for fun!
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
          >
            Try Custom Mode
          </Link>
        </section>

        {/* Related Links */}
        <section className="text-center">
          <h2 className="text-2xl font-bold mb-6">Learn More</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/how-to-play"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg border border-gray-600 hover:bg-gray-800 transition-colors"
            >
              How to Play Guide
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg font-medium h-12 px-8 text-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Start Playing Now
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
