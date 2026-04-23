import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Flag,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Trophy,
  Users
} from "lucide-react";
import { api, getToken, setToken } from "./api/client";
import { ActivityBarChart, ActivityDoughnutChart, AreaTrendChart } from "./components/charts";

const userNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "email", label: "Work Email", icon: Mail },
  { id: "sms", label: "SMS Inbox", icon: Smartphone },
  { id: "phish", label: "Fake Phishing Page", icon: KeyRound },
  { id: "result", label: "Simulation Result", icon: ShieldAlert },
  { id: "training", label: "Training Modules", icon: BookOpenCheck },
  { id: "quiz", label: "Quiz", icon: ClipboardCheck },
  { id: "risk", label: "Risk Score", icon: BarChart3 },
  { id: "rewards", label: "Rewards", icon: Award },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy }
];

const adminNav = [
  { id: "admin-dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Radio },
  { id: "training-admin", label: "Training", icon: GraduationCap },
  { id: "quiz-admin", label: "Quiz Questions", icon: ClipboardCheck },
  { id: "reports", label: "Reports", icon: BarChart3 }
];

const emptyData = {
  users: [],
  campaigns: [],
  emailSimulations: [],
  smsSimulations: [],
  modules: [],
  questions: [],
  activities: [],
  leaderboard: [],
  riskHistory: [],
  adminAnalytics: null,
  userAnalytics: null
};

function idOf(value) {
  return typeof value === "object" && value !== null ? value.id : value;
}

function formatDate(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function riskLevel(score = 0) {
  if (score >= 70) return { label: "High", tone: "danger" };
  if (score >= 40) return { label: "Moderate", tone: "warning" };
  return { label: "Low", tone: "success" };
}

function toRiskChart(history = []) {
  return history.map((item) => ({
    day: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(item.createdAt)),
    score: item.score
  }));
}

function toActivityChart(activities = []) {
  const counts = activities.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3600);
    return () => clearTimeout(timer);
  }, [toast]);

  async function boot() {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const response = await api.get("/auth/me");
      setUser(response.user);
      setPage(response.user.role === "admin" ? "admin-dashboard" : "dashboard");
      await loadData(response.user);
    } catch (error) {
      setToken(null);
      notify(error.message, "danger");
    } finally {
      setLoading(false);
    }
  }

  function notify(message, tone = "success") {
    setToast({ message, tone });
  }

  async function loadData(activeUser = user) {
    if (!activeUser) return;
    setBusy(true);
    try {
      if (activeUser.role === "admin") {
        const [users, campaigns, training, quiz, analytics, activities, leaderboard] = await Promise.all([
          api.get("/users"),
          api.get("/campaigns"),
          api.get("/training"),
          api.get("/quiz"),
          api.get("/analytics/admin"),
          api.get("/activities"),
          api.get("/leaderboard")
        ]);
        setData({
          ...emptyData,
          users: users.users,
          campaigns: campaigns.campaigns,
          modules: training.modules,
          questions: quiz.questions,
          adminAnalytics: analytics,
          activities: activities.activities,
          leaderboard: leaderboard.users
        });
      } else {
        const [email, sms, training, quiz, leaderboard, userAnalytics, riskHistory] = await Promise.all([
          api.get("/simulations/email"),
          api.get("/simulations/sms"),
          api.get("/training"),
          api.get("/quiz"),
          api.get("/leaderboard"),
          api.get("/analytics/user"),
          api.get(`/risk-history/${activeUser.id}`)
        ]);
        setData({
          ...emptyData,
          campaigns: [...email.simulations, ...sms.simulations],
          emailSimulations: email.simulations,
          smsSimulations: sms.simulations,
          modules: training.modules,
          questions: quiz.questions,
          leaderboard: leaderboard.users,
          userAnalytics,
          activities: userAnalytics.activities,
          riskHistory: riskHistory.history
        });
      }
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function login(payload) {
    setBusy(true);
    try {
      const response = await api.post("/auth/login", payload);
      setToken(response.token);
      setUser(response.user);
      setPage(response.user.role === "admin" ? "admin-dashboard" : "dashboard");
      await loadData(response.user);
      notify(`Welcome back, ${response.user.name}.`);
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setBusy(false);
    }
  }

  async function register(payload) {
    setBusy(true);
    try {
      const response = await api.post("/auth/register", payload);
      setToken(response.token);
      setUser(response.user);
      setPage(response.user.role === "admin" ? "admin-dashboard" : "dashboard");
      await loadData(response.user);
      notify("Account created. You can now add your own SEAST data.");
    } catch (error) {
      notify(error.message, "danger");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setData(emptyData);
    setPage("dashboard");
  }

  async function refreshMe() {
    const response = await api.get("/auth/me");
    setUser(response.user);
    await loadData(response.user);
    return response.user;
  }

  if (loading) return <Splash />;
  if (!user) return <><AuthScreen onLogin={login} onRegister={register} busy={busy} /><Toast toast={toast} /></>;

  const nav = user.role === "admin" ? adminNav : userNav;
  const activePage = nav.some((item) => item.id === page) ? page : nav[0].id;

  return (
    <div className="app-shell">
      <Sidebar user={user} nav={nav} page={activePage} onPage={setPage} onLogout={logout} />
      <main className="main-panel">
        <Topbar user={user} busy={busy} />
        <div className="page-wrap">
          {user.role === "admin" ? (
            <AdminPages page={activePage} data={data} reload={() => loadData(user)} notify={notify} />
          ) : (
            <UserPages
              page={activePage}
              data={data}
              user={user}
              setUser={setUser}
              reload={refreshMe}
              notify={notify}
              setPage={setPage}
              lastResult={lastResult}
              setLastResult={setLastResult}
            />
          )}
        </div>
      </main>
      <Toast toast={toast} />
    </div>
  );
}

function Splash() {
  return <main className="splash"><Loader2 className="spin" /><span>Loading SEAST</span></main>;
}

function AuthScreen({ onLogin, onRegister, busy }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin", department: "Security" });

  function submit(event) {
    event.preventDefault();
    if (mode === "login") onLogin({ email: form.email, password: form.password });
    else onRegister(form);
  }

  return (
    <main className="auth-screen">
      <section className="auth-hero">
        <div className="brand-lockup">
          <Shield />
          <div>
            <strong>SEAST</strong>
            <span>Social Engineering Awareness and Simulation Tool</span>
          </div>
        </div>
        <div className="auth-copy">
          <span className="eyebrow">Cyber awareness platform</span>
          <h1>Build stronger security habits through guided simulations.</h1>
          <p>
            Run phishing drills, track risky behavior, assign training, and measure progress in one focused workspace.
          </p>
        </div>
        <div className="auth-points">
          <div className="auth-point"><Mail size={18} /><span>Email and SMS simulations</span></div>
          <div className="auth-point"><BarChart3 size={18} /><span>Risk scoring and reporting</span></div>
          <div className="auth-point"><BookOpenCheck size={18} /><span>Training modules and quizzes</span></div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="brand-lockup">
          <Shield />
          <div>
            <strong>SEAST Console</strong>
            <span>Sign in or create your workspace.</span>
          </div>
        </div>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")} type="button">Sign In</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")} type="button">Get Started</button>
        </div>
        <form className="form-stack" onSubmit={submit}>
          {mode === "register" && (
            <>
              <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
              <label>Department<input value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></label>
              <label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="admin">Admin</option><option value="user">User</option></select></label>
            </>
          )}
          <label>Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
          <label>Password<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={6} /></label>
          <button className="primary-btn" type="submit" disabled={busy}>
            {busy ? <Loader2 className="spin" size={18} /> : <ShieldCheck size={18} />}
            {mode === "login" ? "Enter platform" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({ user, nav, page, onPage, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand"><Shield className="brand-icon" /><div><strong>SEAST</strong><span>Awareness Platform</span></div></div>
      <nav>
        {nav.map((item) => {
          const Icon = item.icon;
          return <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => onPage(item.id)}><Icon size={18} /><span>{item.label}</span></button>;
        })}
      </nav>
      <div className="sidebar-footer">
        <div className="mini-profile"><div className="avatar">{user.name.slice(0, 2).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.role === "admin" ? "Administrator" : user.department}</span></div></div>
        <button className="ghost-btn" onClick={onLogout}><LogOut size={16} />Logout</button>
      </div>
    </aside>
  );
}

function Topbar({ user, busy }) {
  const level = riskLevel(user.riskScore);
  return (
    <header className="topbar">
      <div><span className="eyebrow">Ethical training environment</span><h2>{user.role === "admin" ? "Security operations" : `Welcome, ${user.name.split(" ")[0]}`}</h2></div>
      <div className="topbar-actions">
        {busy && <Pill icon={Loader2} label="Syncing" tone="info" spin />}
        <Pill icon={Shield} label={user.role === "admin" ? "Admin" : `${level.label} risk`} tone={user.role === "admin" ? "info" : level.tone} />
        <Pill icon={Award} label={`${user.points || 0} pts`} tone="success" />
      </div>
    </header>
  );
}

function AdminPages({ page, data, reload, notify }) {
  const pages = {
    "admin-dashboard": <AdminDashboard data={data} />,
    users: <AdminUsers data={data} reload={reload} notify={notify} />,
    campaigns: <AdminCampaigns data={data} reload={reload} notify={notify} />,
    "training-admin": <AdminTraining data={data} reload={reload} notify={notify} />,
    "quiz-admin": <AdminQuiz data={data} reload={reload} notify={notify} />,
    reports: <Reports data={data} />
  };
  return pages[page];
}

function UserPages({ page, data, user, setUser, reload, notify, setPage, lastResult, setLastResult }) {
  async function act(campaign, action) {
    try {
      const response = await api.post(`/simulations/${campaign.id}/${action}`, {});
      setUser(response.user);
      setLastResult({ action, campaign, warning: response.warning, user: response.user });
      await reload();
      notify(response.warning, action === "report" ? "success" : "warning");
      setPage(action === "click" ? "phish" : "result");
    } catch (error) {
      notify(error.message, "danger");
    }
  }

  async function completeTraining(module) {
    try {
      const response = await api.post(`/training/${module.id}/complete`, {});
      setUser(response.user);
      await reload();
      notify(`${module.title} completed. Risk reduced and points awarded.`);
    } catch (error) {
      notify(error.message, "danger");
    }
  }

  const pages = {
    dashboard: <UserDashboard data={data} user={user} />,
    email: <SimulationInbox title="Work Email" icon={Mail} simulations={data.emailSimulations} onAct={act} />,
    sms: <SimulationInbox title="SMS Inbox" icon={Smartphone} simulations={data.smsSimulations} onAct={act} />,
    phish: <FakePhishingPage campaign={lastResult?.campaign || data.campaigns[0]} onSubmit={(campaign) => act(campaign, "credentials")} />,
    result: <SimulationResult result={lastResult} setPage={setPage} />,
    training: <TrainingModules modules={data.modules} user={user} onComplete={completeTraining} />,
    quiz: <Quiz questions={data.questions} setUser={setUser} reload={reload} notify={notify} />,
    risk: <RiskPage user={user} data={data} />,
    rewards: <RewardsPage user={user} />,
    leaderboard: <Leaderboard users={data.leaderboard} currentUser={user} />
  };
  return pages[page];
}

function AdminDashboard({ data }) {
  const metrics = data.adminAnalytics?.metrics || {};
  const breakdown = data.adminAnalytics?.activityBreakdown || [];
  return (
    <Page title="Admin Dashboard" subtitle="Live operational metrics from PostgreSQL. Add data from the management pages when the database is empty.">
      <div className="metric-grid">
        <MetricCard icon={Users} label="Users" value={metrics.users || 0} />
        <MetricCard icon={Radio} label="Active campaigns" value={metrics.activeCampaigns || 0} tone="success" />
        <MetricCard icon={BookOpenCheck} label="Training modules" value={metrics.trainingModules || 0} tone="warning" />
        <MetricCard icon={ShieldAlert} label="Average risk" value={metrics.avgRisk || 0} tone="danger" />
      </div>
      <div className="grid two">
        <ChartCard title="Activity mix">
          {breakdown.length ? <ActivityDoughnutChart points={breakdown} /> : <EmptyState title="No activities yet" text="Run simulations, submit quizzes, or complete training to populate analytics." />}
        </ChartCard>
        <ActivityList activities={data.activities.slice(0, 8)} title="Recent activity" />
      </div>
    </Page>
  );
}

function UserDashboard({ data, user }) {
  const chart = toRiskChart(data.riskHistory);
  const activityChart = toActivityChart(data.activities);
  return (
    <Page title="User Dashboard" subtitle="Your assigned simulations, learning progress, and risk score update after each backend-tracked action.">
      <div className="metric-grid">
        <RiskCard user={user} />
        <MetricCard icon={Radio} label="Assigned simulations" value={data.campaigns.length} tone="info" />
        <MetricCard icon={BookOpenCheck} label="Assigned training" value={(user.assignedTraining || []).length} tone="warning" />
        <MetricCard icon={Trophy} label="Reward points" value={user.points || 0} tone="success" />
      </div>
      <div className="grid two">
        <ChartCard title="Risk history">
          {chart.length ? <AreaTrendChart points={chart} /> : <EmptyState title="No risk history yet" text="Your first account baseline will appear after registration and future actions." />}
        </ChartCard>
        <ChartCard title="Activity breakdown">
          {activityChart.length ? <ActivityBarChart points={activityChart} /> : <EmptyState title="No activity yet" text="Open a simulation, report it, complete training, or submit a quiz." />}
        </ChartCard>
      </div>
    </Page>
  );
}

function SimulationInbox({ title, icon: Icon, simulations, onAct }) {
  return (
    <Page title={title} subtitle="Every message here is an educational simulation and is safe to inspect.">
      <div className="message-list">
        {simulations.length ? simulations.map((campaign) => (
          <article className="message-card" key={campaign.id}>
            <div className="message-icon"><Icon size={24} /></div>
            <div className="message-body">
              <div className="message-head"><div><span>{campaign.name}</span><h3>{campaign.subject}</h3></div><Pill icon={AlertTriangle} label={campaign.tactic || "Simulation"} tone="warning" /></div>
              <p>{campaign.preview}</p>
              <blockquote>{campaign.body}</blockquote>
              <div className="simulation-label"><AlertTriangle size={16} /> Educational simulation. Report suspicious messages instead of following links.</div>
              <div className="button-row">
                <button className="secondary-btn" onClick={() => onAct(campaign, "click")}><KeyRound size={17} />Open link</button>
                <button className="success-btn" onClick={() => onAct(campaign, "report")}><Flag size={17} />Report phishing</button>
              </div>
            </div>
          </article>
        )) : <EmptyState title="No simulations assigned" text="Ask an admin to create an active email or SMS campaign and assign it to you." />}
      </div>
    </Page>
  );
}

function FakePhishingPage({ campaign, onSubmit }) {
  const [form, setForm] = useState({ email: "", password: "" });
  return (
    <Page title="Fake Phishing Page" subtitle="This controlled page demonstrates credential-harvesting risk. Submitted values are never sent to or stored by the backend.">
      {!campaign ? <EmptyState title="No active simulation" text="Click a simulation link first, or ask an admin to assign a campaign." /> : (
        <div className="phish-wrap">
          <section className="fake-browser">
            <div className="browser-bar"><span /><span /><span /><strong>https://secure-login-awareness.training</strong></div>
            <form className="fake-login" onSubmit={(event) => { event.preventDefault(); onSubmit(campaign); }}>
              <ShieldAlert size={38} />
              <h3>SEAST SSO Verification</h3>
              <p>{campaign.preview || "Session expired. Sign in to continue."}</p>
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" />
              <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Password" type="password" />
              <button className="danger-btn" type="submit">Sign in</button>
            </form>
          </section>
          <section className="insight-panel">
            <h3>Learning warning</h3>
            <p>This page records only that a credential submission occurred. It never stores the email or password typed into this form.</p>
            <ul className="check-list"><li>Check the domain before signing in.</li><li>Urgency is a common manipulation tactic.</li><li>Report suspicious messages to reduce risk.</li></ul>
          </section>
        </div>
      )}
    </Page>
  );
}

function SimulationResult({ result, setPage }) {
  const reported = result?.action === "report";
  return (
    <Page title="Simulation Result" subtitle="Every simulation action returns an immediate explanation and backend score update.">
      {!result ? <EmptyState title="No simulation result yet" text="Take an action in Work Email or SMS Inbox to see feedback." /> : (
        <section className={`result-panel ${reported ? "success" : "danger"}`}>
          {reported ? <ShieldCheck size={54} /> : <ShieldAlert size={54} />}
          <h2>{reported ? "Successful Report" : "Learning Moment"}</h2>
          <p>{result.warning}</p>
          <div className="result-details"><span>Campaign: {result.campaign.subject}</span><span>Action: {result.action}</span><span>Current risk: {result.user.riskScore}</span></div>
          <div className="button-row center"><button className="primary-btn" onClick={() => setPage(reported ? "dashboard" : "training")}>{reported ? "Back to dashboard" : "Start training"}</button></div>
        </section>
      )}
    </Page>
  );
}

function TrainingModules({ modules, user, onComplete }) {
  const assigned = new Set((user.assignedTraining || []).map(idOf));
  const completed = new Set((user.completedTraining || []).map(idOf));
  return (
    <Page title="Training Modules" subtitle="Complete assigned modules to reduce risk and earn reward points.">
      <div className="module-grid">
        {modules.length ? modules.map((module) => {
          const isAssigned = assigned.has(module.id);
          const isCompleted = completed.has(module.id);
          return (
            <article className={`module-card ${isAssigned ? "assigned" : ""} ${isCompleted ? "completed" : ""}`} key={module.id}>
              <div className="module-head"><BookOpenCheck /><Pill icon={isCompleted ? CheckCircle2 : isAssigned ? AlertTriangle : GraduationCap} label={isCompleted ? "Completed" : isAssigned ? "Assigned" : module.difficulty} tone={isCompleted ? "success" : isAssigned ? "warning" : "info"} /></div>
              <h3>{module.title}</h3><p>{module.summary || module.content || "No summary provided yet."}</p>
              <div className="module-meta"><span>{module.category}</span><span>{module.duration}</span><span>+{module.points} pts</span></div>
              <button className={isCompleted ? "ghost-btn" : "primary-btn"} disabled={isCompleted} onClick={() => onComplete(module)}>{isCompleted ? "Completed" : "Complete module"}</button>
            </article>
          );
        }) : <EmptyState title="No training modules" text="Admins can create modules from Training management." />}
      </div>
    </Page>
  );
}

function Quiz({ questions, setUser, reload, notify }) {
  const [answers, setAnswers] = useState({});
  async function submit(event) {
    event.preventDefault();
    try {
      const response = await api.post("/quiz/submit", { answers: Object.entries(answers).map(([questionId, answerIndex]) => ({ questionId, answerIndex })) });
      setUser(response.user);
      await reload();
      notify(`Quiz submitted: ${response.score}%. ${response.score >= 80 ? "Risk reduced and points awarded." : "Keep practicing with training modules."}`, response.score >= 80 ? "success" : "warning");
    } catch (error) {
      notify(error.message, "danger");
    }
  }
  return (
    <Page title="Quiz System" subtitle="Quiz scoring is validated by the backend and updates risk history.">
      {!questions.length ? <EmptyState title="No quiz questions" text="Admins can add questions from Quiz Questions management." /> : (
        <form className="quiz-panel" onSubmit={submit}>
          {questions.map((question) => <article className="question-card" key={question.id}><h3>{question.prompt}</h3>{question.options.map((option, index) => <label className="option" key={option}><input type="radio" name={question.id} value={index} onChange={() => setAnswers({ ...answers, [question.id]: index })} required />{option}</label>)}</article>)}
          <button className="primary-btn" type="submit"><ClipboardCheck size={18} />Submit quiz</button>
        </form>
      )}
    </Page>
  );
}

function RiskPage({ user, data }) {
  return (
    <Page title="My Risk Score" subtitle="Risk score changes are created by backend activity events and stored in risk history.">
      <div className="grid two"><RiskCard user={user} large /><ActivityList activities={data.activities} title="Risk-changing activity" /></div>
    </Page>
  );
}

function RewardsPage({ user }) {
  return (
    <Page title="Rewards and Badges" subtitle="Reporting, training completion, and strong quiz performance earn rewards.">
      <div className="metric-grid"><MetricCard icon={Award} label="Points" value={user.points || 0} tone="success" /><MetricCard icon={Shield} label="Badges" value={(user.badges || []).length} tone="info" /></div>
      <div className="badge-grid">{(user.badges || []).length ? user.badges.map((badge) => <div className="badge-card" key={badge}><Award /><strong>{badge}</strong></div>) : <EmptyState title="No badges yet" text="Report simulations, complete training, and score high on quizzes." />}</div>
    </Page>
  );
}

function Leaderboard({ users, currentUser }) {
  return (
    <Page title="Leaderboard" subtitle="Rankings are generated from live user points and risk scores.">
      <TableCard>
        {users.length ? <table><thead><tr><th>#</th><th>Name</th><th>Department</th><th>Points</th><th>Risk</th></tr></thead><tbody>{users.map((user, index) => <tr key={user.id} className={user.id === currentUser.id ? "current-row" : ""}><td>{index + 1}</td><td>{user.name}</td><td>{user.department}</td><td>{user.points}</td><td>{user.riskScore}</td></tr>)}</tbody></table> : <EmptyState title="No leaderboard data" text="Create user accounts and complete activities to populate rankings." />}
      </TableCard>
    </Page>
  );
}

function AdminUsers({ data, reload, notify }) {
  const empty = { name: "", email: "", password: "", role: "user", department: "General", riskScore: 35, points: 0 };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  async function save(event) {
    event.preventDefault();
    try {
      const payload = { ...form, riskScore: Number(form.riskScore), points: Number(form.points) };
      if (editing && !payload.password) delete payload.password;
      if (editing) await api.put(`/users/${editing}`, payload);
      else await api.post("/users", payload);
      setForm(empty); setEditing(null); await reload(); notify("User saved.");
    } catch (error) { notify(error.message, "danger"); }
  }
  async function remove(id) {
    try { await api.delete(`/users/${id}`); await reload(); notify("User deleted."); } catch (error) { notify(error.message, "danger"); }
  }
  return (
    <Page title="User Management" subtitle="Create admins and users with hashed passwords and role-based permissions.">
      <AdminForm title={editing ? "Edit user" : "Create user"} onSubmit={save} onCancel={() => { setForm(empty); setEditing(null); }}>
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} minLength={editing ? undefined : 6} /></label>
        <label>Role<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="user">User</option><option value="admin">Admin</option></select></label>
        <label>Department<input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
        <label>Risk score<input type="number" min="0" max="100" value={form.riskScore} onChange={(e) => setForm({ ...form, riskScore: e.target.value })} /></label>
        <label>Points<input type="number" min="0" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></label>
      </AdminForm>
      <TableCard>{data.users.length ? <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Risk</th><th>Points</th><th></th></tr></thead><tbody>{data.users.map((user) => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td>{user.role}</td><td>{user.riskScore}</td><td>{user.points}</td><td className="table-actions"><button className="icon-btn" onClick={() => { setEditing(user.id); setForm({ ...empty, ...user, password: "" }); }}><Edit3 size={16} /></button><button className="icon-btn danger" onClick={() => remove(user.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table> : <EmptyState title="No users yet" text="Use the form above to create users and admins." />}</TableCard>
    </Page>
  );
}

function AdminCampaigns({ data, reload, notify }) {
  const empty = { name: "", type: "email", subject: "", preview: "", body: "", tactic: "", targetTraining: "", assignedUsers: [], status: "active" };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  async function save(event) {
    event.preventDefault();
    try {
      const payload = { ...form, targetTraining: form.targetTraining || undefined };
      if (editing) await api.put(`/campaigns/${editing}`, payload);
      else await api.post("/campaigns", payload);
      setForm(empty); setEditing(null); await reload(); notify("Campaign saved.");
    } catch (error) { notify(error.message, "danger"); }
  }
  async function remove(id) {
    try { await api.delete(`/campaigns/${id}`); await reload(); notify("Campaign deleted."); } catch (error) { notify(error.message, "danger"); }
  }
  return (
    <Page title="Campaign Builder" subtitle="Create educational email and SMS simulations and assign them to selected users.">
      <AdminForm title={editing ? "Edit campaign" : "Create campaign"} onSubmit={save} onCancel={() => { setForm(empty); setEditing(null); }}>
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="email">Email</option><option value="sms">SMS</option></select></label>
        <label>Subject<input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required /></label>
        <label>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option></select></label>
        <label>Preview<input value={form.preview} onChange={(e) => setForm({ ...form, preview: e.target.value })} /></label>
        <label>Tactic<input value={form.tactic} onChange={(e) => setForm({ ...form, tactic: e.target.value })} /></label>
        <label>Target training<select value={form.targetTraining} onChange={(e) => setForm({ ...form, targetTraining: e.target.value })}><option value="">Auto match</option>{data.modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
        <label>Assigned users<select multiple value={form.assignedUsers} onChange={(e) => setForm({ ...form, assignedUsers: Array.from(e.target.selectedOptions, (option) => option.value) })}>{data.users.filter((user) => user.role === "user").map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
        <label className="wide">Body<textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></label>
      </AdminForm>
      <TableCard>{data.campaigns.length ? <table><thead><tr><th>Name</th><th>Type</th><th>Subject</th><th>Status</th><th>Assigned</th><th></th></tr></thead><tbody>{data.campaigns.map((campaign) => <tr key={campaign.id}><td>{campaign.name}</td><td>{campaign.type}</td><td>{campaign.subject}</td><td>{campaign.status}</td><td>{campaign.assignedUsers?.length || 0}</td><td className="table-actions"><button className="icon-btn" onClick={() => { setEditing(campaign.id); setForm({ ...empty, ...campaign, targetTraining: idOf(campaign.targetTraining) || "", assignedUsers: (campaign.assignedUsers || []).map(idOf) }); }}><Edit3 size={16} /></button><button className="icon-btn danger" onClick={() => remove(campaign.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table> : <EmptyState title="No campaigns yet" text="Create the first campaign above after adding users and optional training modules." />}</TableCard>
    </Page>
  );
}

function AdminTraining({ data, reload, notify }) {
  const empty = { title: "", category: "Phishing", duration: "10 min", difficulty: "Foundation", summary: "", points: 10, content: "" };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  async function save(event) {
    event.preventDefault();
    try {
      const payload = { ...form, points: Number(form.points) };
      if (editing) await api.put(`/training/${editing}`, payload); else await api.post("/training", payload);
      setForm(empty); setEditing(null); await reload(); notify("Training module saved.");
    } catch (error) { notify(error.message, "danger"); }
  }
  async function remove(id) { try { await api.delete(`/training/${id}`); await reload(); notify("Training module deleted."); } catch (error) { notify(error.message, "danger"); } }
  return (
    <Page title="Training Management" subtitle="Create adaptive remediation modules that campaigns and simulation outcomes can assign.">
      <AdminForm title={editing ? "Edit module" : "Create module"} onSubmit={save} onCancel={() => { setForm(empty); setEditing(null); }}>
        {["title", "category", "duration", "summary"].map((field) => <label key={field}>{field}<input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={field === "title" || field === "category"} /></label>)}
        <label>Difficulty<select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label>
        <label>Points<input type="number" min="0" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} /></label>
        <label className="wide">Content<textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>
      </AdminForm>
      <div className="module-grid">{data.modules.length ? data.modules.map((module) => <article className="module-card" key={module.id}><div className="module-head"><BookOpenCheck /><Pill icon={GraduationCap} label={module.difficulty} /></div><h3>{module.title}</h3><p>{module.summary}</p><div className="module-meta"><span>{module.category}</span><span>{module.duration}</span><span>{module.points} pts</span></div><div className="button-row"><button className="secondary-btn" onClick={() => { setEditing(module.id); setForm({ ...empty, ...module }); }}><Edit3 size={16} />Edit</button><button className="danger-btn" onClick={() => remove(module.id)}><Trash2 size={16} />Delete</button></div></article>) : <EmptyState title="No modules yet" text="Create training content above." />}</div>
    </Page>
  );
}

function AdminQuiz({ data, reload, notify }) {
  const empty = { prompt: "", optionsText: "Option A\nOption B\nOption C\nOption D", correctAnswerIndex: 0, category: "General", difficulty: "Foundation" };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  async function save(event) {
    event.preventDefault();
    try {
      const options = form.optionsText.split("\n").map((item) => item.trim()).filter(Boolean);
      const payload = { prompt: form.prompt, options, correctAnswerIndex: Number(form.correctAnswerIndex), category: form.category, difficulty: form.difficulty };
      if (editing) await api.put(`/quiz/questions/${editing}`, payload); else await api.post("/quiz/questions", payload);
      setForm(empty); setEditing(null); await reload(); notify("Quiz question saved.");
    } catch (error) { notify(error.message, "danger"); }
  }
  async function remove(id) { try { await api.delete(`/quiz/questions/${id}`); await reload(); notify("Quiz question deleted."); } catch (error) { notify(error.message, "danger"); } }
  return (
    <Page title="Quiz Question Management" subtitle="Create and maintain backend-scored awareness quiz questions.">
      <AdminForm title={editing ? "Edit question" : "Create question"} onSubmit={save} onCancel={() => { setForm(empty); setEditing(null); }}>
        <label className="wide">Prompt<textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} required /></label>
        <label className="wide">Options, one per line<textarea value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} required /></label>
        <label>Correct option index<input type="number" min="0" value={form.correctAnswerIndex} onChange={(e) => setForm({ ...form, correctAnswerIndex: e.target.value })} /></label>
        <label>Category<input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
        <label>Difficulty<select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}><option>Foundation</option><option>Intermediate</option><option>Advanced</option></select></label>
      </AdminForm>
      <div className="quiz-panel">{data.questions.length ? data.questions.map((question) => <article className="question-card" key={question.id}><h3>{question.prompt}</h3><p>{question.options.join(" | ")}</p><div className="button-row"><button className="secondary-btn" onClick={() => { setEditing(question.id); setForm({ ...empty, ...question, optionsText: question.options.join("\n") }); }}><Edit3 size={16} />Edit</button><button className="danger-btn" onClick={() => remove(question.id)}><Trash2 size={16} />Delete</button></div></article>) : <EmptyState title="No quiz questions yet" text="Create questions above. Users will see them immediately." />}</div>
    </Page>
  );
}

function Reports({ data }) {
  const chart = toActivityChart(data.activities);
  return (
    <Page title="Reports and Analytics" subtitle="Analytics are calculated from campaigns, user records, and activity logs stored in PostgreSQL.">
      <div className="grid two">
        <ChartCard title="Activity report">{chart.length ? <ActivityBarChart points={chart} color="#39d98a" /> : <EmptyState title="No report data" text="Activity logs appear after simulations, training, and quizzes." />}</ChartCard>
        <ActivityList activities={data.activities} title="Activity log" />
      </div>
    </Page>
  );
}

function AdminForm({ title, children, onSubmit, onCancel }) {
  return <form className="admin-form" onSubmit={onSubmit}><div className="form-title"><h3>{title}</h3><div className="button-row"><button className="ghost-btn" type="button" onClick={onCancel}>Clear</button><button className="primary-btn" type="submit"><Plus size={18} />Save</button></div></div><div className="form-grid">{children}</div></form>;
}

function Page({ title, subtitle, children }) {
  return <section className="page"><div className="page-title"><h1>{title}</h1><p>{subtitle}</p></div>{children}</section>;
}

function MetricCard({ icon: Icon, label, value, tone = "info" }) {
  return <article className={`metric-card ${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></article>;
}

function RiskCard({ user, large = false }) {
  const level = riskLevel(user.riskScore);
  return <article className={`risk-card ${large ? "large" : ""}`}><div><span className="eyebrow">{level.label} risk</span><h3>{user.riskScore}<small>/100</small></h3><Pill icon={Shield} label={`${user.points || 0} reward points`} tone={level.tone} /></div><div className="risk-ring" style={{ "--score": `${Math.min(360, (user.riskScore || 0) * 3.6)}deg` }}><span>{user.riskScore}</span><small>risk</small></div></article>;
}

function ChartCard({ title, children }) {
  return <article className="card chart-card"><h3>{title}</h3>{children}</article>;
}

function ActivityList({ activities, title }) {
  return <article className="card"><h3>{title}</h3><div className="activity-list">{activities.length ? activities.map((activity) => <div className="activity-row" key={activity.id}><div><strong>{activity.target || activity.type}</strong><span>{activity.detail}</span><small>{formatDate(activity.createdAt)}</small></div><Pill icon={activity.riskDelta > 0 ? AlertTriangle : CheckCircle2} label={`${activity.riskDelta > 0 ? "+" : ""}${activity.riskDelta} risk`} tone={activity.riskDelta > 0 ? "danger" : "success"} /></div>) : <EmptyState title="No activity yet" text="Actions will appear here as users interact with the platform." />}</div></article>;
}

function TableCard({ children }) {
  return <article className="table-card">{children}</article>;
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><ShieldAlert /><strong>{title}</strong><span>{text}</span></div>;
}

function Pill({ icon: Icon, label, tone = "info", spin = false }) {
  return <span className={`pill ${tone}`}><Icon size={14} className={spin ? "spin" : ""} />{label}</span>;
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast ${toast.tone}`}>{toast.message}</div>;
}
