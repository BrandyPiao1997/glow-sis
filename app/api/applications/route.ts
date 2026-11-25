import { NextResponse } from "next/server";
import { adminConfigured, checkAdminPassword } from "@/lib/auth";
import { createApplication, listApplications, validateApplication } from "@/lib/store";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const result = validateApplication(body);
  if (!result.ok || !result.value) {
    return NextResponse.json({ error: result.error ?? "Invalid application." }, { status: 400 });
  }
  try {
    const app = await createApplication(result.value);
    return NextResponse.json({ application: app }, { status: 201 });
  } catch (err) {
    console.error("POST /api/applications failed:", err);
    return NextResponse.json({ error: "Could not save the application. Please try again." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const applications = await listApplications();
    return NextResponse.json({
      applications,
      adminConfigured: adminConfigured(),
    });
  } catch (err) {
    console.error("GET /api/applications failed:", err);
    return NextResponse.json({ error: "Could not load applications." }, { status: 500 });
  }
}
