import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-10 py-6 border-b border-slate-800">
        <h1 className="text-3xl font-bold text-blue-500">
          🚌 Where Is My Bus
        </h1>

        <div className="flex gap-8 items-center">
          <a href="#features" className="hover:text-blue-400 transition">
            Features
          </a>

          <a href="#about" className="hover:text-blue-400 transition">
            About
          </a>

          <a href="#contact" className="hover:text-blue-400 transition">
            Contact
          </a>

          <Link
            to="/login"
            className="rounded-lg bg-blue-600 px-5 py-2 hover:bg-blue-700 transition"
          >
            Login
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-8 py-28 text-center">
        <h1 className="max-w-5xl text-6xl font-bold leading-tight">
          Smart School Bus Tracking &
          <span className="text-blue-500">
            {" "}
            Transportation Management
          </span>
        </h1>

        <p className="mt-8 max-w-3xl text-xl text-gray-300">
          Monitor buses in real time, optimize routes, manage attendance,
          notify parents instantly, and provide a safer transportation
          experience for schools, colleges and universities.
        </p>

        <div className="mt-10 flex gap-5">
          <Link
            to="/login"
            className="rounded-lg bg-blue-600 px-8 py-4 text-lg hover:bg-blue-700 transition"
          >
            Get Started
          </Link>

          <a
            href="#features"
            className="rounded-lg border border-gray-500 px-8 py-4 text-lg hover:border-blue-500 transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="mx-auto grid max-w-6xl gap-8 px-8 pb-24 md:grid-cols-3"
      >
        <div className="rounded-xl bg-slate-900 p-6">
          <h2 className="mb-3 text-2xl font-bold">
            📍 Live GPS Tracking
          </h2>
          <p className="text-gray-400">
            Track buses in real time with accurate location updates.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 p-6">
          <h2 className="mb-3 text-2xl font-bold">
            🧑‍🎓 Attendance
          </h2>
          <p className="text-gray-400">
            Smart attendance and pickup management for every student.
          </p>
        </div>

        <div className="rounded-xl bg-slate-900 p-6">
          <h2 className="mb-3 text-2xl font-bold">
            🗺 Route Optimization
          </h2>
          <p className="text-gray-400">
            Automatically optimize bus routes to reduce travel time.
          </p>
        </div>
      </section>

      {/* About */}
      <section
        id="about"
        className="mx-auto max-w-6xl px-8 py-16 text-center"
      >
        <h2 className="mb-6 text-4xl font-bold text-blue-500">
          About Where Is My Bus
        </h2>

        <p className="mx-auto max-w-4xl text-lg text-gray-300 leading-8">
          Where Is My Bus is a smart transportation platform designed for
          schools, colleges and universities. It provides real-time GPS
          tracking, attendance management, intelligent route optimization,
          parent notifications and secure administration to make student
          transportation safer and more efficient.
        </p>
      </section>

      {/* Footer */}
      <footer
        id="contact"
        className="border-t border-slate-800 py-8 text-center text-gray-400"
      >
        © 2026 Where Is My Bus. All Rights Reserved.
      </footer>
    </div>
  );
}