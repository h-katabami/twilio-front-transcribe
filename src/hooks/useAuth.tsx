import { Amplify } from "aws-amplify";
import { fetchAuthSession, getCurrentUser, signIn, signOut } from "aws-amplify/auth";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";
import { CookieStorage } from "aws-amplify/utils";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { env } from "./useEnv";

let configured = false;

function ensureConfigured() {
	if (configured) {
		return;
	}

	cognitoUserPoolsTokenProvider.setKeyValueStorage(
		new CookieStorage({
			domain: env.authDomain,
			path: env.authPath,
			secure: true,
			sameSite: "lax",
		}),
	);

	Amplify.configure({
		Auth: {
			Cognito: {
				userPoolId: env.authUserPoolId,
				userPoolClientId: env.authUserPoolWebClientId,
				loginWith: {
					email: true,
					username: true,
				},
			},
		},
	});

	configured = true;
}

async function getIdToken(): Promise<string | null> {
	ensureConfigured();
	try {
		await getCurrentUser();
		const session = await fetchAuthSession();
		return session.tokens?.idToken?.toString() ?? null;
	} catch {
		return null;
	}
}

async function authSignIn(
	username: string,
	password: string,
): Promise<{ success: boolean; message: string }> {
	ensureConfigured();
	try {
		await signIn({ username, password });
		return { success: true, message: "ok" };
	} catch (error) {
		const name =
			typeof error === "object" && error !== null && "name" in error
				? String((error as { name?: unknown }).name ?? "")
				: "";

		if (name === "UserAlreadyAuthenticatedException") {
			return { success: true, message: "already-authenticated" };
		}

		return { success: false, message: error instanceof Error ? error.message : "サインインに失敗しました" };
	}
}

async function authSignOut(): Promise<void> {
	ensureConfigured();
	await signOut();
}

async function isAuthenticated(): Promise<boolean> {
	return (await getIdToken()) !== null;
}

export type AuthContextValue = {
	ready: boolean;
	authenticated: boolean;
	signIn: (username: string, password: string) => Promise<{ success: boolean; message: string }>;
	signOut: () => Promise<void>;
	getToken: () => Promise<string | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [ready, setReady] = useState(false);
	const [authenticated, setAuthenticated] = useState(false);

	useEffect(() => {
		let alive = true;
		void isAuthenticated().then((ok) => {
			if (!alive) return;
			setAuthenticated(ok);
			setReady(true);
		});
		return () => {
			alive = false;
		};
	}, []);

	const signIn = useCallback(async (username: string, password: string) => {
		const result = await authSignIn(username, password);
		if (result.success) {
			setAuthenticated(true);
		}
		return result;
	}, []);

	const signOut = useCallback(async () => {
		await authSignOut();
		setAuthenticated(false);
	}, []);

	const getToken = useCallback(async () => getIdToken(), []);

	const value = useMemo(
		() => ({ ready, authenticated, signIn, signOut, getToken }),
		[ready, authenticated, signIn, signOut, getToken],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used inside AuthProvider");
	}
	return context;
}
