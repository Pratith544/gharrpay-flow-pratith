import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const OwnerAuth = () => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectTo = searchParams.get('redirect') || '/owner-portal';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      toast.error('Could not verify your account. Please try again.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .select('*')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (ownerError) {
      toast.error(ownerError.message);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (!owner) {
      toast.error('No owner account found. Please sign up or contact Gharpayy team.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    toast.success('Welcome to your owner portal!');
    navigate(redirectTo);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Full Name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!phone.trim()) {
      toast.error('Phone is required');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'owner',
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    let userId = data.user?.id;

    if (!userId) {
      const { data: currentUser, error: currentUserError } = await supabase.auth.getUser();
      if (currentUserError || !currentUser.user) {
        toast.success('Signup successful. Please check your email to verify your account.');
        setLoading(false);
        return;
      }
      userId = currentUser.user.id;
    }

    const { error: ownerInsertError } = await supabase.from('owners').insert({
      user_id: userId,
      name: fullName,
      email,
      phone,
      company_name: companyName || null,
      is_active: true,
    });

    if (ownerInsertError) {
      toast.error(ownerInsertError.message);
      setLoading(false);
      return;
    }

    // user_roles is not in the generated Supabase types, so we cast for this insert
    const { error: roleInsertError } = await (supabase as unknown as {
      from: (table: string) => {
        insert: (values: { user_id: string; role: string }) => Promise<{ error: Error | null }>;
      };
    })
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'owner',
      });

    if (roleInsertError) {
      toast.error(roleInsertError.message);
      setLoading(false);
      return;
    }

    toast.success('Owner account created successfully!');
    navigate(redirectTo);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset link sent to your email');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex w-1/2 relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'hsl(220, 16%, 8%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-display font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white tracking-tight">Gharpayy</h1>
              <p className="text-[11px] text-white/40">Owner Portal</p>
            </div>
          </div>
        </div>

        <motion.div
          className="relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.32, 0.72, 0, 1] }}
        >
          <h2 className="font-display text-2xl font-bold text-white leading-tight mb-4 tracking-tight">
            Real-time visibility into<br />your property performance.
          </h2>
          <p className="text-white/40 text-sm max-w-md leading-relaxed">
            Track occupancy, bookings, and effort across your properties in a single owner dashboard.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10">
            {[
              { label: 'Occupancy', value: 'Live' },
              { label: 'Properties', value: 'Multi' },
              { label: 'Portal', value: 'Owner' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl p-4 border border-white/[0.06]"
                style={{ background: 'hsl(220, 14%, 12%)' }}
              >
                <p className="font-display font-bold text-white text-base flex items-center gap-2">
                  <Building2 size={16} className="text-accent" />
                  {s.value}
                </p>
                <p className="text-[10px] text-white/30 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-[10px] text-white/20">© 2026 Gharpayy. All rights reserved.</p>

        {/* Subtle gradient orb */}
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, hsl(25, 95%, 53%), transparent)' }}
        />
      </div>

      {/* Right auth form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          className="w-full max-w-[380px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-display font-bold">G</span>
            </div>
            <h1 className="font-display font-bold text-base text-foreground tracking-tight">Gharpayy</h1>
            <span className="text-xs text-muted-foreground ml-1">Owner Portal</span>
          </div>

          <h2 className="font-display font-bold text-xl text-foreground mb-1 tracking-tight">
            {mode === 'login' ? 'Owner sign in' : mode === 'signup' ? 'Create owner account' : 'Reset password'}
          </h2>
          <p className="text-xs text-muted-foreground mb-8">
            {mode === 'login'
              ? 'Sign in to your owner portal'
              : mode === 'signup'
              ? 'Create your property owner account'
              : 'Enter your email to reset password'}
          </p>

          <form
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleForgot}
            className="space-y-4"
          >
            {mode === 'signup' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-2xs">Full Name</Label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      className="pl-9 h-11 rounded-xl"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-2xs">Phone</Label>
                  <div className="relative">
                    <Phone
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      className="pl-9 h-11 rounded-xl"
                      placeholder="Your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-2xs">Company Name (optional)</Label>
                  <div className="relative">
                    <Building2
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      className="pl-9 h-11 rounded-xl"
                      placeholder="Your company name"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-2xs">Email</Label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="pl-9 h-11 rounded-xl"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <Label className="text-2xs">Password</Label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    className="pl-9 pr-9 h-11 rounded-xl"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <button
                type="button"
                onClick={() => setMode('forgot')}
                className="text-2xs text-accent hover:underline"
              >
                Forgot password?
              </button>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                ? 'Create Owner Account'
                : 'Send Reset Link'}
            </Button>
          </form>

          <p className="text-2xs text-center text-muted-foreground mt-8">
            {mode === 'login' ? (
              <>
                Don't have an owner account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-accent hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an owner account?{' '}
                <button
                  onClick={() => setMode('login')}
                  className="text-accent hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default OwnerAuth;

