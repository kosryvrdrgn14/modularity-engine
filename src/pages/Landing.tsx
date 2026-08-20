import { motion } from "framer-motion";
import { Link } from "react-router";
import { Play, Gamepad2, Swords, Shield } from "lucide-react";

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
    >
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-500/25">
              <Gamepad2 className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Modularity Engine
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-lg text-gray-400 mb-8"
          >
            A Vampire Survivors-style roguelike survival game
          </motion.p>

          {/* Play Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Link
              to="/game"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-yellow-500/25 transition-all transform hover:scale-105 active:scale-95"
            >
              <Play className="w-6 h-6" />
              Play Game
            </Link>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-12 grid grid-cols-3 gap-6 text-center"
          >
            <div className="p-4">
              <Swords className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
              <h3 className="text-white font-semibold">3 Weapons</h3>
              <p className="text-gray-500 text-sm">Projectile, Orbit, Area</p>
            </div>
            <div className="p-4">
              <Shield className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <h3 className="text-white font-semibold">5 Enemies</h3>
              <p className="text-gray-500 text-sm">+ Boss Fight</p>
            </div>
            <div className="p-4">
              <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <h3 className="text-white font-semibold">5 Minutes</h3>
              <p className="text-gray-500 text-sm">Survive or Kill Boss</p>
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700"
          >
            <p className="text-gray-400 text-sm">
              <span className="text-white font-semibold">Controls:</span> Click/Tap to move • WASD/Arrows • 1/2/3 for upgrades
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
