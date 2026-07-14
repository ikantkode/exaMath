import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, formatCurrency, formatDate } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Plus, Trash2, ClipboardList, TrendingUp, FileBarChart, Lock, Unlock, FileUp, FileText, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { Textarea } from '@/components/ui/textarea';

interface Expense {
  id: string;
  amount: number;
  currency: string;
  conversionRate?: number | null;
  amountUSD: number;
  description: string;
  expenseType: string;
  date: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

interface SubFile {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

interface SubChangeOrder {
  id: string;
  description: string;
  value: number;
  createdAt: string;
  files: SubFile[];
}

interface SubAgreement {
  id: string;
  subcontractorName: string;
  contractValue: number;
  description: string | null;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
  files: SubFile[];
  changeOrders: SubChangeOrder[];
  project: { id: string; name: string; clientName: string | null };
}

const Expenses = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canWrite = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const isOwner = user?.role === 'OWNER';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [formData, setFormData] = useState({ amount: '', description: '', expenseType: 'MATERIAL', date: new Date().toISOString().split('T')[0], categoryId: '', currency: 'USD', conversionRate: '' });

  const amountUSD = (() => {
    const amt = parseFloat(formData.amount);
    if (formData.currency === 'PKR' && formData.conversionRate) {
      return amt * parseFloat(formData.conversionRate);
    }
    return amt;
  })();

  const [agreements, setAgreements] = useState<SubAgreement[]>([]);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementForm, setAgreementForm] = useState({ subcontractorName: '', contractValue: '', description: '' });
  const [showDetailModal, setShowDetailModal] = useState<SubAgreement | null>(null);
  const [showChangeOrderModal, setShowChangeOrderModal] = useState<SubAgreement | null>(null);
  const [coForm, setCoForm] = useState({ description: '', value: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadingCO, setUploadingCO] = useState<string | null>(null);

  useEffect(() => {
    fetchExpenses();
    fetchAgreements();
  }, [id]);

  const fetchExpenses = () => {
    api.get<Expense[]>(`/expenses/?projectId=${id}`).then(setExpenses).finally(() => setLoading(false));
  };

  const fetchAgreements = () => {
    api.get<SubAgreement[]>(`/subcontractors/?projectId=${id}`).then(setAgreements);
  };

  // Expense handlers
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    const rate = formData.currency === 'PKR' && formData.conversionRate ? parseFloat(formData.conversionRate) : undefined;
    await api.post('/expenses/', {
      amount: amt,
      currency: formData.currency,
      conversionRate: rate,
      amountUSD: formData.currency === 'PKR' ? amt * (rate || 0) : amt,
      description: formData.description,
      expenseType: formData.expenseType,
      date: formData.date,
      categoryId: formData.categoryId || null,
      projectId: id,
    });
    setShowExpenseModal(false);
    setFormData({ amount: '', description: '', expenseType: 'MATERIAL', date: new Date().toISOString().split('T')[0], categoryId: '', currency: 'USD', conversionRate: '' });
    fetchExpenses();
    toast.success('Expense recorded');
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Delete this expense?')) return;
    await api.delete(`/expenses/${expenseId}`);
    fetchExpenses();
    toast.success('Expense deleted');
  };

  const totalAmount = expenses.reduce((sum, e) => sum + (e.amountUSD || e.amount), 0);

  const typeVariants: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
    LABOR: 'default',
    MATERIAL: 'secondary',
    EQUIPMENT: 'outline',
    SUBCONTRACTOR: 'destructive',
  };

  // Agreement handlers
  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await api.post<SubAgreement>('/subcontractors/', {
      projectId: id,
      subcontractorName: agreementForm.subcontractorName,
      contractValue: parseFloat(agreementForm.contractValue),
      description: agreementForm.description || null,
    });
    setShowAgreementModal(false);
    setAgreementForm({ subcontractorName: '', contractValue: '', description: '' });
    fetchAgreements();
    toast.success(`Agreement created for ${result.subcontractorName}`);
  };

  const handleFinalize = async (agreementId: string) => {
    await api.patch(`/subcontractors/${agreementId}/finalize`);
    fetchAgreements();
    setShowDetailModal(null);
    toast.success('Agreement finalized');
  };

  const handleUnfinalize = async (agreementId: string) => {
    if (!confirm('Unfinalize this agreement? You will be able to modify it and add change orders.')) return;
    await api.patch(`/subcontractors/${agreementId}/unfinalize`);
    fetchAgreements();
    setShowDetailModal(null);
    toast.success('Agreement unfinalized');
  };

  const handleDeleteAgreement = async (agreementId: string) => {
    if (!confirm('Delete this agreement and all its data?')) return;
    await api.delete(`/subcontractors/${agreementId}`);
    fetchAgreements();
    setShowDetailModal(null);
    toast.success('Agreement deleted');
  };

  const handleCreateChangeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showChangeOrderModal) return;
    await api.post(`/subcontractors/${showChangeOrderModal.id}/change-orders`, {
      description: coForm.description,
      value: parseFloat(coForm.value),
    });
    setShowChangeOrderModal(null);
    setCoForm({ description: '', value: '' });
    fetchAgreements();
    toast.success('Change order added');
  };

  const handleDeleteChangeOrder = async (agreementId: string, coId: string) => {
    if (!confirm('Delete this change order?')) return;
    await api.delete(`/subcontractors/${agreementId}/change-orders/${coId}`);
    fetchAgreements();
    toast.success('Change order deleted');
  };

  const handleUploadFile = async (agreementId: string, file: File) => {
    setUploading(true);
    const formData2 = new FormData();
    formData2.append('file', file);
    try {
      await api.post(`/subcontractors/${agreementId}/files`, formData2);
      fetchAgreements();
      toast.success('File uploaded');
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCOFile = async (agreementId: string, coId: string, file: File) => {
    setUploadingCO(coId);
    const formData2 = new FormData();
    formData2.append('file', file);
    try {
      await api.post(`/subcontractors/${agreementId}/change-orders/${coId}/files`, formData2);
      fetchAgreements();
      toast.success('File uploaded');
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingCO(null);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    await api.delete(`/subcontractors/files/${fileId}`);
    fetchAgreements();
    toast.success('File deleted');
  };

  const totalSubcontractorValue = agreements.reduce((sum, a) => sum + a.contractValue + a.changeOrders.reduce((s, co) => s + co.value, 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/projects/${id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Track project expenses and subcontractor agreements</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
        </TabsList>

        {/* EXPENSES TAB */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setShowExpenseModal(true)}>
              <Plus className="h-4 w-4" /> Add Expense
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Expenses</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">{formatCurrency(totalAmount)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Separator />
                <p className="mt-2 text-xs text-muted-foreground">Sum of all recorded expenses</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Expense Count</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">{expenses.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <Separator />
                <p className="mt-2 text-xs text-muted-foreground">Total expense entries</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Expense</CardDescription>
                <CardTitle className="text-2xl font-semibold tabular-nums">
                  {expenses.length > 0 ? formatCurrency(totalAmount / expenses.length) : formatCurrency(0)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Separator />
                <p className="mt-2 text-xs text-muted-foreground">Per expense entry</p>
              </CardContent>
            </Card>
          </div>

          {expenses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <FileBarChart className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No expenses recorded for this project</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Original</TableHead>
                      <TableHead className="text-right">USD Equivalent</TableHead>
                      <TableHead>Logged By</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(expense.date)}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell><Badge variant={typeVariants[expense.expenseType] || 'secondary'}>{expense.expenseType}</Badge></TableCell>
                        <TableCell>{expense.category?.name || '-'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {expense.currency === 'PKR' ? 'Rs ' : '$'}{expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {expense.currency === 'PKR' && expense.conversionRate && (
                            <span className="ml-1 text-xs text-muted-foreground">(@{expense.conversionRate})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          ${((expense.amountUSD || expense.amount)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{expense.createdBy.name}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SUBCONTRACTORS TAB */}
        <TabsContent value="subcontractors" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Subcontractor Agreements</h2>
              <p className="text-sm text-muted-foreground">
                {agreements.length} agreement{agreements.length !== 1 ? 's' : ''} · Total value: {formatCurrency(totalSubcontractorValue)}
              </p>
            </div>
            {canWrite && (
              <Button onClick={() => setShowAgreementModal(true)}>
                <Plus className="h-4 w-4" /> Add Agreement
              </Button>
            )}
          </div>

          {agreements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No subcontractor agreements for this project</p>
                <p className="text-xs text-muted-foreground mt-1">Log fixed contracts, proposals, and change orders here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {agreements.map(agreement => (
                <Card key={agreement.id} className={agreement.isFinalized ? 'border-l-2 border-l-green-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{agreement.subcontractorName}</h3>
                          {agreement.isFinalized ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100"><Lock className="mr-1 h-3 w-3" /> Finalized</Badge>
                          ) : (
                            <Badge variant="secondary"><Unlock className="mr-1 h-3 w-3" /> Draft</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Contract: {formatCurrency(agreement.contractValue)}
                          {agreement.changeOrders.length > 0 && (
                            <span> + {formatCurrency(agreement.changeOrders.reduce((s, co) => s + co.value, 0))} change orders</span>
                          )}
                        </p>
                        {agreement.description && <p className="text-sm">{agreement.description}</p>}
                        <p className="text-xs text-muted-foreground">
                          Created {formatDate(agreement.createdAt)} · {agreement.files.length} file{agreement.files.length !== 1 ? 's' : ''} · {agreement.changeOrders.length} change order{agreement.changeOrders.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowDetailModal(agreement)}>View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* EXPENSE DIALOG */}
      <Dialog open={showExpenseModal} onOpenChange={setShowExpenseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency || 'USD'} onValueChange={value => setFormData({ ...formData, currency: value ?? 'USD', conversionRate: '' })}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="PKR">PKR (Rs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} required />
              </div>
            </div>
            {formData.currency === 'PKR' && (
              <div className="space-y-2">
                <Label htmlFor="conversionRate">PKR → USD Rate</Label>
                <Input id="conversionRate" type="number" step="0.0001" placeholder="e.g. 278.50" value={formData.conversionRate} onChange={e => setFormData({ ...formData, conversionRate: e.target.value })} required />
                {formData.amount && formData.conversionRate && (
                  <p className="text-xs text-muted-foreground">USD equivalent: ${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.expenseType || ''} onValueChange={value => setFormData({ ...formData, expenseType: value ?? '' })}>
                <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LABOR">Labor</SelectItem>
                  <SelectItem value="MATERIAL">Material</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                  <SelectItem value="SUBCONTRACTOR">Subcontractor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowExpenseModal(false)}>Cancel</Button>
              <Button type="submit">Add Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CREATE AGREEMENT DIALOG */}
      <Dialog open={showAgreementModal} onOpenChange={setShowAgreementModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Subcontractor Agreement</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateAgreement} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subName">Subcontractor Name</Label>
              <Input id="subName" value={agreementForm.subcontractorName} onChange={e => setAgreementForm({ ...agreementForm, subcontractorName: e.target.value })} placeholder="e.g. ABC Electric Co." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contractVal">Contract Value ($)</Label>
              <Input id="contractVal" type="number" step="0.01" value={agreementForm.contractValue} onChange={e => setAgreementForm({ ...agreementForm, contractValue: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subDesc">Description</Label>
              <Textarea id="subDesc" value={agreementForm.description} onChange={e => setAgreementForm({ ...agreementForm, description: e.target.value })} placeholder="Scope of work, notes..." />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setShowAgreementModal(false)}>Cancel</Button>
              <Button type="submit">Create Agreement</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AGREEMENT DETAIL DIALOG */}
      {showDetailModal && (
        <Dialog open onOpenChange={open => { if (!open) setShowDetailModal(null); }}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle>{showDetailModal.subcontractorName}</DialogTitle>
                {showDetailModal.isFinalized ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700"><Lock className="mr-1 h-3 w-3" /> Finalized</Badge>
                ) : (
                  <Badge variant="secondary"><Unlock className="mr-1 h-3 w-3" /> Draft</Badge>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contract Value</p>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(showDetailModal.contractValue)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total w/ Change Orders</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatCurrency(showDetailModal.contractValue + showDetailModal.changeOrders.reduce((s, co) => s + co.value, 0))}
                  </p>
                </div>
              </div>

              {showDetailModal.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm mt-1">{showDetailModal.description}</p>
                </div>
              )}

              {/* Contract Files */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Contract Files ({showDetailModal.files.length})</p>
                  {canWrite && (
                    <Label htmlFor={`file-upload-${showDetailModal.id}`} className="cursor-pointer">
                      <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                        <FileUp className="h-3 w-3" /> Upload
                      </span>
                      <Input
                        id={`file-upload-${showDetailModal.id}`}
                        type="file"
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleUploadFile(showDetailModal.id, e.target.files[0]); }}
                        disabled={uploading}
                      />
                    </Label>
                  )}
                </div>
                {showDetailModal.files.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No files attached</p>
                ) : (
                  <div className="space-y-1">
                    {showDetailModal.files.map(file => (
                      <div key={file.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-muted/50">
                        <span className="truncate flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 shrink-0" /> {file.fileName} ({(file.fileSize / 1024).toFixed(1)} KB)
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <a href={`/uploads/${file.filePath}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline p-1">
                            <Download className="h-3.5 w-3.5" />
                          </a>
                          {canWrite && (
                            <button onClick={() => handleDeleteFile(file.id)} className="text-destructive hover:underline p-1">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Orders */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Change Orders ({showDetailModal.changeOrders.length})</p>
                  {canWrite && !showDetailModal.isFinalized && (
                    <Button variant="outline" size="sm" onClick={() => setShowChangeOrderModal(showDetailModal)}>
                      <Plus className="h-3 w-3" /> Add CO
                    </Button>
                  )}
                </div>
                {showDetailModal.changeOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No change orders</p>
                ) : (
                  <div className="space-y-2">
                    {showDetailModal.changeOrders.map(co => (
                      <Card key={co.id}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <p className="text-sm font-medium">{co.description}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(co.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums text-sm">{formatCurrency(co.value)}</span>
                              {isOwner && !showDetailModal.isFinalized && (
                                <button onClick={() => handleDeleteChangeOrder(showDetailModal.id, co.id)} className="text-destructive hover:underline">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {/* CO Files */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-wrap">
                              {co.files.map(file => (
                                <span key={file.id} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                                  <FileText className="h-3 w-3" /> {file.fileName}
                                  <a href={`/uploads/${file.filePath}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                                    <Download className="h-2.5 w-2.5" />
                                  </a>
                                  {canWrite && (
                                    <button onClick={() => handleDeleteFile(file.id)} className="text-destructive hover:underline ml-1">
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </span>
                              ))}
                            </div>
                            {canWrite && (
                              <Label htmlFor={`co-file-${co.id}`} className="cursor-pointer">
                                <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  <FileUp className="h-3 w-3" />
                                </span>
                                <Input
                                  id={`co-file-${co.id}`}
                                  type="file"
                                  className="hidden"
                                  onChange={e => { if (e.target.files?.[0]) handleUploadCOFile(showDetailModal.id, co.id, e.target.files[0]); }}
                                  disabled={uploadingCO === co.id}
                                />
                              </Label>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {showDetailModal.isFinalized && isOwner && (
                    <Button variant="outline" onClick={() => handleUnfinalize(showDetailModal.id)}>
                      <Unlock className="mr-2 h-3.5 w-3.5" /> Unfinalize
                    </Button>
                  )}
                  {!showDetailModal.isFinalized && canWrite && (
                    <Button onClick={() => handleFinalize(showDetailModal.id)}>
                      <Lock className="mr-2 h-3.5 w-3.5" /> Finalize
                    </Button>
                  )}
                </div>
                {isOwner && (
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteAgreement(showDetailModal.id)}>
                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* CHANGE ORDER DIALOG */}
      {showChangeOrderModal && (
        <Dialog open onOpenChange={open => { if (!open) { setShowChangeOrderModal(null); setCoForm({ description: '', value: '' }); } }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Change Order</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateChangeOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="coDesc">Description</Label>
                <Textarea id="coDesc" value={coForm.description} onChange={e => setCoForm({ ...coForm, description: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coVal">Change Value ($)</Label>
                <Input id="coVal" type="number" step="0.01" value={coForm.value} onChange={e => setCoForm({ ...coForm, value: e.target.value })} required />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => { setShowChangeOrderModal(null); setCoForm({ description: '', value: '' }); }}>Cancel</Button>
                <Button type="submit">Add Change Order</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Expenses;
