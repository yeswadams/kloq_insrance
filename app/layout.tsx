import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import {
Home,
Bot,
History,
Layers,
TrendingUp,
Plus,
Folder,
ShieldCheck,
Truck
} from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
title: "Qlo-Africa | Autonomous Underwriting",
description: "Autonomous AI commercial fleet insurance underwriting platform",
};

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (

);
}