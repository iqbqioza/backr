import { Route, Router } from "@solidjs/router";
import About from "./routes/About";
import Create from "./routes/Create";
import GoalDetail from "./routes/GoalDetail";
import Home from "./routes/Home";

export default function App() {
  return (
    <div class="min-h-screen bg-zinc-950 text-zinc-100">
      <header class="border-b border-zinc-800">
        <nav class="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
          <a href="/" class="text-lg font-bold tracking-tight">
            Backr
          </a>
          <a href="/" class="text-sm text-zinc-400 hover:text-zinc-100">
            探す
          </a>
          <a href="/create" class="text-sm text-zinc-400 hover:text-zinc-100">
            作る
          </a>
          <a href="/about" class="text-sm text-zinc-400 hover:text-zinc-100">
            Backrとは
          </a>
        </nav>
      </header>
      <main class="mx-auto max-w-4xl px-4 py-6">
        <Router>
          <Route path="/" component={Home} />
          <Route path="/g/:nevent" component={GoalDetail} />
          <Route path="/create" component={Create} />
          <Route path="/about" component={About} />
        </Router>
      </main>
    </div>
  );
}
