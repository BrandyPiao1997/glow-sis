import { NextResponse } from "next/server";
import { checkAdminPassword } from "@/lib/auth";
import { deleteApplication, updateApplicationStatus } from "@/lib/store";
import type { Status } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const status = (body as { status?: string })?.status;
  if (status !== "submitted" && status !== "in_review" && status !== "live") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  try {
    const app = await updateApplicationStatus(id, status as Status);
    if (!app) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json({ application: app });
  } catch (err) {
    console.error(`PATCH /api/applications/${id} failed:`, err);
    return NextResponse.json({ error: "Could not update the application." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const password = req.headers.get("x-admin-password");
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const deleted = await deleteApplication(id);
    if (!deleted) return NextResponse.json({ error: "Application not found." }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error(`DELETE /api/applications/${id} failed:`, err);
    return NextResponse.json({ error: "Could not delete the application." }, { status: 500 });
  }
}
