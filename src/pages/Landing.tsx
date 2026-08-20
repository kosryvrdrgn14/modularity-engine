import { Link } from "react-router";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/25">
              <span className="text-4xl">🎮</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Modularity Engine
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-gray-400 mb-8">
            A Vampire Survivors-style roguelike survival game
          </p>

          {/* Play Button */}
          <div>
            <Link
              to="/game"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-yellow-500/25 transition-all"
            >
              ▶ Play Game
            </Link>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="text-2xl mb-2">⚔️</div>
              <h3 className="text-white font-semibold">3 Weapons</h3>
              <p className="text-gray-500 text-sm">Projectile, Orbit, Area</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="text-white font-semibold">5 Enemies</h3>
              <p className="text-gray-500 text-sm">+ Boss Fight</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">⏱️</div>
              <h3 className="text-white font-semibold">5 Minutes</h3>
              <p className="text-gray-500 text-sm">Survive or Kill Boss</p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <p className="text-gray-400 text-sm">
              <span className="text-white font-semibold">Controls:</span> Click/Tap to move • WASD/Arrows • 1/2/3 for upgrades
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
