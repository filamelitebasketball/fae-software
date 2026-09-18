import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { requestOtp, verifyOtp } from "@/lib/otp.functions";
import type { MembershipTier } from "@/lib/use-membership-tier";

export function TierBanner({ tier, onVerified }: { tier: MembershipTier; onVerified: () => void }) {
  const sendCode = useServerFn(requestOtp);
  const checkCode = useServerFn(verifyOtp);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  if (tier === "rfid_linked") {
    return (
      <div className="rounded-xl border border-[var(--line-g)] bg-[rgba(201,162,39,.08)] px-5 py-4">
        <p className="text-sm font-black uppercase tracking-wide text-[var(--gold-l)]">
          Full Member — bracelet linked
        </p>
      </div>
    );
  }

  if (tier === "otp_verified") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--s2)] px-5 py-4">
        <div>
          <p className="text-sm font-bold text-[var(--paint)]">Link your RFID bracelet to become a Full Member</p>
          <p className="mt-1 text-xs text-muted-foreground">
            A linked bracelet handles venue check-in and wallet taps at the court.
          </p>
        </div>
        <Link to="/account/bracelet"><Button size="sm">Link bracelet</Button></Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line-g)] bg-[rgba(201,162,39,.06)] px-5 py-4">
      <p className="text-sm font-bold text-[var(--gold-l)]">Verify your email</p>
      <p className="mt-1 text-xs text-muted-foreground">
        We'll email you a 6-digit code. Verifying confirms your contact details and lets you link an RFID bracelet.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            try {
              const res = await sendCode({ data: undefined as never });
              setSent(true);
              toast.success(`Code sent to ${res.sentTo}`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not send code");
            } finally {
              setSending(false);
            }
          }}
        >
          {sending ? "Sending…" : sent ? "Resend code" : "Send code"}
        </Button>
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          className="w-32 text-center tracking-[0.4em]"
        />
        <Button
          size="sm"
          disabled={verifying || code.length !== 6}
          onClick={async () => {
            setVerifying(true);
            try {
              await checkCode({ data: { code } });
              toast.success("Email verified.");
              setCode("");
              onVerified();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Verification failed");
            } finally {
              setVerifying(false);
            }
          }}
        >
          {verifying ? "Verifying…" : "Verify"}
        </Button>
      </div>
    </div>
  );
}
