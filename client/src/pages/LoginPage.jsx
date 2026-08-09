import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api.js";
import { setToken } from "../auth.js";
import { useToast } from "../components/Toast.jsx";
import { IconFlask, IconEye, IconEyeOff } from "../components/Icons.jsx";

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const { showToast, showError } = useToast();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    try {
      const data = await login(password);
      setToken(data.token);
      onLogin();
      showToast("Logged in");
      navigate("/", { replace: true });
    } catch (err) {
      showError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="login-logo">
          <IconFlask size={22} />
        </div>
        <h1 className="login-title">LabRec</h1>
        <p className="login-sub">Enter the password to continue</p>
        <div className="password-wrap">
          <input
            className="input"
            type={show ? "text" : "password"}
            placeholder="Password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            className="btn-icon password-toggle"
            onClick={() => setShow((s) => !s)}
            title={show ? "Hide password" : "Show password"}
          >
            {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        </div>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
