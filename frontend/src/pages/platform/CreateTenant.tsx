import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { platformApi } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Copy, Check, Shield, Building2, Eye, EyeOff } from 'lucide-react';

const CreateTenant = () => {
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerRole, setOwnerRole] = useState('OWNER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ credentials: { email: string; password: string }; tenant: { name: string; slug: string } } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!companyName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      setError('All fields are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(ownerEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const data = await platformApi.postTenantWithUser(companyName.trim(), ownerName.trim(), ownerEmail.trim(), ownerRole);
      setResult({
        credentials: data.credentials,
        tenant: data.tenant,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Account Created</h1>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Check className="h-5 w-5" />
              Account Successfully Created
            </CardTitle>
            <CardDescription className="text-green-700">
              Send these credentials to the user. They will use this email and password to log in.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Login Credentials
            </CardTitle>
            <CardDescription>
              Tenant: {result.tenant.name} ({result.tenant.slug})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="flex items-center mt-1">
                  <code className="text-sm font-mono flex-1 px-3 py-2 bg-muted rounded">{result.credentials.email}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() => copyToClipboard(result.credentials.email, 'email')}
                  >
                    {copiedField === 'email' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Password</Label>
                <div className="flex items-center mt-1">
                  <code className="text-sm font-mono flex-1 px-3 py-2 bg-muted rounded">
                    {showPassword ? result.credentials.password : '•'.repeat(result.credentials.password.length)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1"
                    onClick={() => copyToClipboard(result.credentials.password, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800 font-medium">Important</p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                <li>This password was generated automatically</li>
                <li>The user should change this password after first login</li>
                <li>Store these credentials securely</li>
                <li>Share the login URL: {window.location.origin}</li>
              </ul>
            </div>

            <Button onClick={() => navigate('/platform/tenants')} className="w-full">
              Back to Tenants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/platform/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create New Account</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create Tenant Account
          </CardTitle>
          <CardDescription>
            Create a new company account. The system will generate a secure password that you'll send to the user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
                placeholder="Acme Corporation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerName">Company Owner Name</Label>
              <Input
                id="ownerName"
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Owner Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                required
                placeholder="john@acme.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerRole">Role</Label>
              <Select value={ownerRole} onValueChange={v => v && setOwnerRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner (Full Access)</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="CREW">Crew</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating Account...' : 'Create Account & Generate Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateTenant;
