import { Route, Router } from "@solidjs/router";
import Header from "./components/Header";
import About from "./routes/About";
import Create from "./routes/Create";
import GoalDetail from "./routes/GoalDetail";
import Home from "./routes/Home";

export default function App() {
  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <main class="mx-auto max-w-4xl px-4 py-6">
        <Router>
          <Route path="/" component={Home} />
          <Route path="/g/:nevent" component={GoalDetail} />
          <Route path="/create" component={Create} />
          <Route path="/about" component={About} />
        </Router>
      </main>
      <footer class="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        Backr — Nostr 上のクラウドファンディング (Zap・All-in)
      </footer>
    </div>
  );
}
