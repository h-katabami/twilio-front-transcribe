import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEnv } from "../hooks/useEnv";

export function SignInPage() {
  const env = useEnv();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setLoading(true);

    const result = await signIn(username, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.message || "エラーが発生しました");
      return;
    }

    const base = env.pathText ? `/${env.pathText}` : "";
    navigate(`${base}/transcribe`, { replace: true });
  };

  return (
    <main className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>サインイン</h1>
        <label>
          ユーザー名
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          パスワード
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        <button type="submit" disabled={loading}>{loading ? "送信中..." : "サインイン"}</button>
      </form>
    </main>
  );
}
