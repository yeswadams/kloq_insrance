"use client";
import { authClient } from "@/app/lib/authClient";
import { useRouter } from "next/navigation";
export function SignOutButton() { const router = useRouter(); return <button className="signout" onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { router.replace("/sign-in"); router.refresh(); } } })}>Sign out</button>; }
