import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEnv } from "../hooks/useEnv";

const signInSchema = z.object({
  username: z.string().min(1, "ユーザー名を入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export function SignInPage() {
  const env = useEnv();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await signIn(values.username, values.password);

    if (!result.success) {
      setError("root", { message: result.message || "エラーが発生しました" });
      return;
    }

    const base = env.pathText ? `/${env.pathText}` : "";
    navigate(`${base}/transcribe`, { replace: true });
  });

  return (
    <main className="auth-layout">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>サインイン</h1>
        <label>
          ユーザー名
          <input type="text" {...register("username")} />
          {errors.username ? <p className="error-text">{errors.username.message}</p> : null}
        </label>
        <label>
          パスワード
          <input type="password" {...register("password")} />
          {errors.password ? <p className="error-text">{errors.password.message}</p> : null}
        </label>
        {errors.root ? <p className="error-text">{errors.root.message}</p> : null}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? "送信中..." : "サインイン"}</button>
      </form>
    </main>
  );
}
