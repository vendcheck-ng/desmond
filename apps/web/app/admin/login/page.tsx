import "../admin.css";
import type { Metadata } from "next";
import { signIn } from "../actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ error?: string; denied?: string }> };

export default async function Login({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <main className="adm" style={{ maxWidth: "28rem" }}>
      <h1>Admin sign in</h1>
      {sp.error && <Flash kind="error">Email or password is incorrect.</Flash>}
      {sp.denied && <Flash kind="error">This account does not have admin access.</Flash>}
      <form action={signIn}>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <p><SubmitButton className="primary" pending="Signing in…">Sign in</SubmitButton></p>
      </form>
    </main>
  );
}
