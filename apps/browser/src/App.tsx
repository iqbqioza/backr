import { Route, Router } from "@solidjs/router";
import { ErrorBoundary } from "solid-js";
import Header from "./components/Header";
import About from "./routes/About";
import Create from "./routes/Create";
import GoalDetail from "./routes/GoalDetail";
import Home from "./routes/Home";

function NotFound() {
  return (
    <div class="py-8 text-center">
      <p class="text-lg font-semibold">Page not found.</p>
      <a href="/" class="mt-2 inline-block text-sm text-amber-300 underline">
        ← Back to list
      </a>
    </div>
  );
}

export default function App() {
  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main class="mx-auto max-w-4xl px-4 py-6">
        <ErrorBoundary
          fallback={(err) => (
            <div class="rounded-lg border border-red-900 bg-red-950/40 p-4 text-center">
              <p class="text-red-300">Something went wrong: {err.message}</p>
              <a href="/" class="mt-2 inline-block text-sm text-red-200 underline">
                ← Back to list
              </a>
            </div>
          )}
        >
          <Router>
            <Route path="/" component={Home} />
            <Route path="/g/:nevent" component={GoalDetail} />
            <Route path="/create" component={Create} />
            <Route path="/about" component={About} />
            <Route path="*" component={NotFound} />
          </Router>
        </ErrorBoundary>
      </main>
      <footer class="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        Backr — Crowdfunding on Nostr (Zap · All-in)
      </footer>
    </div>
  );
}
