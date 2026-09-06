"use client";

import React, { Suspense, useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { authClient, useSession } from "@/lib/auth/auth-client";
import { getExpenses, createGroupExpense, createPersonalExpense, deleteExpense } from "@/actions/expenses";
import {
  getGroups,
  createGroup,
  getGroupSettlementPlan,
  getPendingInvitations,
  acceptGroupInvitation,
  rejectGroupInvitation,
} from "@/actions/groups";
import { getSettlements, createSettlement } from "@/actions/settlements";
import { getBudgets, upsertBudget } from "@/actions/budgets";
import { calculateEqualSplit, calculatePercentageSplit, calculateSharesSplit, roundCurrency } from "@/lib/calculations/split";
import { simplifyDebts } from "@/lib/calculations/simplify";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpendingTrendChart } from "@/components/charts/spending-trend-chart";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { GroupBalanceBarChart } from "@/components/charts/group-balance-bar-chart";
import { BudgetProgressChart } from "@/components/charts/budget-progress-chart";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Invoice01Icon,
  UserGroupIcon,
  TransactionIcon,
  Target01Icon,
  Add01Icon,
  Delete02Icon,
  Logout01Icon,
  UserIcon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

function SplitWiseApp() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "expenses" | "groups" | "settlements" | "budgets">("dashboard");

  // Auth form states
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthPending, setIsAuthPending] = useState(false);

  // Live data states
  const [expenses, setExpenses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [activeGroupPlan, setActiveGroupPlan] = useState<any>(null);

  // Modals & Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isBudgetOpen, setIsBudgetOpen] = useState(false);

  // Add Expense form
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food");
  const [expenseIsGroup, setExpenseIsGroup] = useState(false);
  const [expenseGroupId, setExpenseGroupId] = useState("");
  const [expenseSplitType, setExpenseSplitType] = useState<"EQUAL" | "PERCENTAGE" | "SHARES">("EQUAL");

  // Create Group form
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupMemberEmails, setGroupMemberEmails] = useState("");

  // Settlement form
  const [settlePayer, setSettlePayer] = useState("");
  const [settleReceiver, setSettleReceiver] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleGroupId, setSettleGroupId] = useState("");

  // Budget form
  const [budgetCategory, setBudgetCategory] = useState("Food");
  const [budgetAmount, setBudgetAmount] = useState("");

  // Load live data from server actions
  const loadData = () => {
    startTransition(async () => {
      try {
        const [exp, grp, stl, bdg, invs] = await Promise.all([
          getExpenses(),
          getGroups(),
          getSettlements(),
          getBudgets(),
          getPendingInvitations(),
        ]);
        setExpenses(exp || []);
        setGroups(grp || []);
        setSettlements(stl || []);
        setBudgets(bdg || []);
        setPendingInvitations(invs || []);
        if (grp && grp.length > 0 && !expenseGroupId) {
          setExpenseGroupId(grp[0].id);
        }
      } catch (err) {
        console.error("Failed to load live data", err);
      }
    });
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    startTransition(async () => {
      try {
        await acceptGroupInvitation(invitationId);
        toast.success("Joined group successfully!");
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to accept invitation");
      }
    });
  };

  const handleRejectInvitation = async (invitationId: string) => {
    startTransition(async () => {
      try {
        await rejectGroupInvitation(invitationId);
        toast.success("Invitation declined");
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to decline invitation");
      }
    });
  };

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session?.user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthPending(true);
    try {
      if (authMode === "signup") {
        const res = await authClient.signUp.email({
          email: authEmail,
          password: authPassword,
          name: authName,
        });
        if (res.error) {
          const msg = res.error.message || "Failed to sign up";
          setAuthError(msg);
          toast.error(msg);
        } else {
          toast.success("Welcome to SplitFlow! Account created.");
          setIsAuthModalOpen(false);
        }
      } else {
        const res = await authClient.signIn.email({
          email: authEmail,
          password: authPassword,
        });
        if (res.error) {
          const msg = res.error.message || "Invalid credentials";
          setAuthError(msg);
          toast.error(msg);
        } else {
          toast.success("Welcome back! Signed in.");
          setIsAuthModalOpen(false);
        }
      }
    } catch (err: any) {
      const msg = err.message || "Authentication error";
      setAuthError(msg);
      toast.error(msg);
    } finally {
      setIsAuthPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: typeof window !== "undefined" ? window.location.origin : "/",
      });
    } catch (err: any) {
      const msg = err.message || "Google sign-in failed";
      setAuthError(msg);
      toast.error(msg);
    }
  };

  // Create expense handler
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (!expenseTitle || isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please provide a valid title and positive amount");
      return;
    }

    if (expenseIsGroup && (!expenseGroupId || groups.length === 0)) {
      toast.error("No group selected. Please create a group first.");
      return;
    }

    startTransition(async () => {
      try {
        if (expenseIsGroup && expenseGroupId) {
          const selectedGrp = groups.find((g) => g.id === expenseGroupId);
          const memberIds = selectedGrp ? selectedGrp.members.map((m: any) => m.userId) : [session?.user?.id!];
          const equalSplits = calculateEqualSplit(amountNum, memberIds);

          await createGroupExpense({
            title: expenseTitle,
            amount: amountNum,
            category: expenseCategory,
            groupId: expenseGroupId,
            splitType: expenseSplitType,
            payers: [{ userId: session?.user?.id!, amount: amountNum }],
            splits: equalSplits.map((s) => ({ userId: s.userId, amount: s.amount })),
          });
        } else {
          await createPersonalExpense({
            title: expenseTitle,
            amount: amountNum,
            category: expenseCategory,
          });
        }

        setExpenseTitle("");
        setExpenseAmount("");
        setIsAddExpenseOpen(false);
        toast.success(`Expense "${expenseTitle}" added successfully!`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to add expense");
      }
    });
  };

  // Create group handler
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName) {
      toast.error("Group name is required");
      return;
    }

    startTransition(async () => {
      try {
        const emails = groupMemberEmails
          .split(",")
          .map((em) => em.trim())
          .filter(Boolean);

        await createGroup({
          name: groupName,
          description: groupDescription,
          memberEmails: emails,
        });

        setGroupName("");
        setGroupDescription("");
        setGroupMemberEmails("");
        setIsCreateGroupOpen(false);
        toast.success(`Group "${groupName}" created!`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to create group");
      }
    });
  };

  // Settlement handler
  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(settleAmount);
    if (isNaN(amt) || amt <= 0 || !settlePayer || !settleReceiver) {
      toast.error("Please fill in valid payer, receiver, and amount");
      return;
    }

    startTransition(async () => {
      try {
        await createSettlement({
          groupId: settleGroupId || undefined,
          payerId: settlePayer,
          receiverId: settleReceiver,
          amount: amt,
        });

        setSettleAmount("");
        setIsSettleOpen(false);
        toast.success("Settlement payment recorded!");
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to record settlement");
      }
    });
  };

  const handleQuickSettle = (groupId: string, payerId: string, receiverId: string, amount: number) => {
    setSettleGroupId(groupId);
    setSettlePayer(payerId);
    setSettleReceiver(receiverId);
    setSettleAmount(amount.toString());
    setIsSettleOpen(true);
  };

  // Budget handler
  const handleUpsertBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(budgetAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid positive budget amount");
      return;
    }

    startTransition(async () => {
      try {
        await upsertBudget(budgetCategory, amt);
        setBudgetAmount("");
        setIsBudgetOpen(false);
        toast.success(`Monthly budget for ${budgetCategory} saved!`);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to save budget");
      }
    });
  };

  const handleOpenGroupPlan = async (groupId: string) => {
    startTransition(async () => {
      try {
        const plan = await getGroupSettlementPlan(groupId);
        setActiveGroupPlan(plan);
        setActiveTab("settlements");
        toast.success(`Loaded debt graph for ${plan.group.name}`);
      } catch (err: any) {
        toast.error(err.message || "Failed to get group settlement plan");
      }
    });
  };

  // Financial calculations
  const totalYouAreOwed = groups.reduce((acc, g) => (g.userNetBalance > 0 ? acc + g.userNetBalance : acc), 0);
  const totalYouOwe = groups.reduce((acc, g) => (g.userNetBalance < 0 ? acc + Math.abs(g.userNetBalance) : acc), 0);
  const netBalance = totalYouAreOwed - totalYouOwe;

  // Home Landing Page for unauthenticated visitors (with interactive demo & auth modal)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [demoAmount, setDemoAmount] = useState(3000);
  const [demoSplitType, setDemoSplitType] = useState<"EQUAL" | "PERCENTAGE" | "SHARES">("EQUAL");
  const [demoPayer, setDemoPayer] = useState("Rahul");
  const [demoPercentages, setDemoPercentages] = useState<{ [key: string]: number }>({
    Rahul: 40,
    Varun: 20,
    Amit: 20,
    Sneha: 20,
  });
  const [demoShares, setDemoShares] = useState<{ [key: string]: number }>({
    Rahul: 2,
    Varun: 1,
    Amit: 1,
    Sneha: 1,
  });

  // Calculate demo shares
  const demoMembers = ["Rahul", "Varun", "Amit", "Sneha"];
  let demoParticipantShares: { userId: string; amount: number }[] = [];
  if (demoSplitType === "EQUAL") {
    demoParticipantShares = calculateEqualSplit(demoAmount, demoMembers);
  } else if (demoSplitType === "PERCENTAGE") {
    const pSplits = demoMembers.map((m) => ({ userId: m, percentage: demoPercentages[m] || 0 }));
    demoParticipantShares = calculatePercentageSplit(demoAmount, pSplits).shares || [];
  } else if (demoSplitType === "SHARES") {
    const sSplits = demoMembers.map((m) => ({ userId: m, shares: demoShares[m] || 1 }));
    demoParticipantShares = calculateSharesSplit(demoAmount, sSplits).shares || [];
  }

  // Calculate demo balances & simplified settlements
  const demoNetBalances: Record<string, number> = {};
  for (const m of demoMembers) {
    const paid = m === demoPayer ? demoAmount : 0;
    const share = demoParticipantShares.find((s) => s.userId === m)?.amount || 0;
    demoNetBalances[m] = roundCurrency(paid - share);
  }
  const demoSimplifiedSettlements = simplifyDebts(demoNetBalances);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground font-bold text-lg flex items-center justify-center shadow-md">
                S
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight">SplitFlow</span>
                <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Smart Splits
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAuthMode("login");
                  setIsAuthModalOpen(true);
                }}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                className="shadow-sm"
                onClick={() => {
                  setAuthMode("signup");
                  setIsAuthModalOpen(true);
                }}
              >
                Get Started
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground shadow-xs">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Deterministic Currency Engine & Minimal Graph Settlements</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-balance leading-tight">
            Split expenses cleanly. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Settle debts without headaches.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground text-balance">
            Accurate down to 0.01 cents with zero remainder drift. Track group expenses, simplify circular debts into the minimum number of payments, and stay within monthly budgets.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              className="gap-2 shadow-md px-6 text-sm font-semibold"
              onClick={() => {
                setAuthMode("signup");
                setIsAuthModalOpen(true);
              }}
            >
              Get Started Free
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="gap-2 border-border px-6 text-sm"
              onClick={handleGoogleSignIn}
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </Button>
          </div>
        </section>

        {/* Live Interactive Split Demo */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 w-full pb-16">
          <Card className="border-border shadow-lg overflow-hidden bg-card/50 backdrop-blur-xs">
            <CardHeader className="bg-muted/30 border-b border-border pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                    <span>⚡ Live Interactive Calculator</span>
                  </div>
                  <CardTitle className="text-lg">Try the Split & Settlement Engine</CardTitle>
                </div>
                <div className="flex gap-1.5 p-1 bg-muted rounded-lg self-start">
                  {(["EQUAL", "PERCENTAGE", "SHARES"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setDemoSplitType(t)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        demoSplitType === t
                          ? "bg-background text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "EQUAL" ? "Equal" : t === "PERCENTAGE" ? "Percentage" : "Shares"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Total Bill Amount (₹)</label>
                  <Input
                    type="number"
                    value={demoAmount}
                    onChange={(e) => setDemoAmount(Math.max(1, Number(e.target.value)))}
                    className="font-semibold text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Paid By</label>
                  <Select
                    value={demoPayer}
                    onChange={(e) => setDemoPayer(e.target.value)}
                  >
                    {demoMembers.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m} (Paid ₹{demoAmount.toLocaleString()})
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Dynamic split input adjustments */}
              {demoSplitType === "PERCENTAGE" && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                  <p className="text-xs font-semibold">Custom Percentages (Must sum to 100%)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {demoMembers.map((m) => (
                      <div key={m} className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">{m} (%)</label>
                        <Input
                          type="number"
                          value={demoPercentages[m]}
                          onChange={(e) =>
                            setDemoPercentages({ ...demoPercentages, [m]: Number(e.target.value) })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {demoSplitType === "SHARES" && (
                <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-3">
                  <p className="text-xs font-semibold">Custom Shares (e.g. 2 shares = 2x portion)</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {demoMembers.map((m) => (
                      <div key={m} className="space-y-1">
                        <label className="text-[11px] text-muted-foreground">{m} (Shares)</label>
                        <Input
                          type="number"
                          min="1"
                          value={demoShares[m]}
                          onChange={(e) =>
                            setDemoShares({ ...demoShares, [m]: Math.max(1, Number(e.target.value)) })
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Output Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Individual shares */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Calculated Participant Breakdown
                  </h4>
                  <div className="space-y-2">
                    {demoParticipantShares.map((s) => {
                      const isPayer = s.userId === demoPayer;
                      const net = demoNetBalances[s.userId] || 0;
                      return (
                        <div
                          key={s.userId}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{s.userId}</span>
                              {isPayer && (
                                <Badge variant="outline" className="text-[10px] py-0 text-emerald-600 bg-emerald-500/10">
                                  Payer
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">Share: ₹{s.amount.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`text-sm font-bold ${
                                net > 0
                                  ? "text-emerald-500"
                                  : net < 0
                                  ? "text-rose-500"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {net > 0 ? `+₹${net.toFixed(2)}` : net < 0 ? `-₹${Math.abs(net).toFixed(2)}` : "Settled"}
                            </span>
                            <p className="text-[10px] text-muted-foreground">
                              {net > 0 ? "gets back" : net < 0 ? "owes" : "even"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Minimal settlements output */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Minimized Settlement Transactions
                  </h4>
                  <div className="p-4 rounded-lg border border-border bg-primary/5 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Our debt-minimization algorithm matches debtors with creditors to settle the group in fewest transactions:
                    </p>
                    {demoSimplifiedSettlements.length === 0 ? (
                      <p className="text-xs font-medium text-emerald-600">All balances are completely settled!</p>
                    ) : (
                      <div className="space-y-2">
                        {demoSimplifiedSettlements.map((tx, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-md bg-background border border-border text-xs font-medium"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-rose-500">{tx.from}</span>
                              <span className="text-muted-foreground">pays</span>
                              <span className="font-bold text-emerald-500">{tx.to}</span>
                            </div>
                            <span className="font-bold text-foreground">₹{tx.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Feature Grid */}
        <section className="py-12 border-t border-border bg-muted/20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-center mb-8">Designed for Production Expense Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-2">
                    01
                  </div>
                  <CardTitle className="text-base">Cent-Accurate Math</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Zero floating-point rounding errors. Remainder cents are deterministically distributed across participants so totals always match 100%.
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-2">
                    02
                  </div>
                  <CardTitle className="text-base">Debt Simplification</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  A greedy multi-party settlement optimizer simplifies circular debts across groups into the minimum possible transactions.
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader className="pb-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-2">
                    03
                  </div>
                  <CardTitle className="text-base">Budget & Category Tracking</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Set monthly category limits, monitor personal and shared expenditures, and receive visual warnings as you near budget ceilings.
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Auth Modal / Dialog */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <Card className="border-border shadow-2xl relative">
                <button
                  onClick={() => setIsAuthModalOpen(false)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-sm font-bold p-1 rounded-md"
                >
                  ✕
                </button>

                <CardHeader className="pb-4">
                  <div className="size-10 rounded-xl bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mb-2 shadow-xs">
                    S
                  </div>
                  <CardTitle className="text-lg">
                    {authMode === "login" ? "Sign In to SplitFlow" : "Create SplitFlow Account"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {authMode === "login"
                      ? "Sign in with Google or your email credentials"
                      : "Start tracking and splitting group expenses"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-border"
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="size-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-border w-full" />
                    <span className="bg-card px-2 text-[11px] text-muted-foreground uppercase">
                      or email
                    </span>
                  </div>

                  {authError && (
                    <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md">
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleEmailAuth} className="space-y-3">
                    {authMode === "signup" && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Full Name</label>
                        <Input
                          placeholder="e.g. Rahul Sharma"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-xs font-medium">Email Address</label>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium">Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full" disabled={isAuthPending}>
                      {isAuthPending
                        ? (authMode === "login" ? "Signing In..." : "Creating Account...")
                        : (authMode === "login" ? "Sign In" : "Create Account")}
                    </Button>
                  </form>
                </CardContent>

                <CardFooter className="justify-center border-t border-border pt-4">
                  <button
                    onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {authMode === "login"
                      ? "Don't have an account? Sign Up"
                      : "Already have an account? Sign In"}
                  </button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="py-6 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} SplitFlow. Smart expense tracking, group splitting & settlement.
        </footer>
      </div>
    );
  }

  // Authenticated Main View
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile Drawer (Slide-Over Sidebar) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-card border-r border-border shadow-2xl flex flex-col justify-between p-0 z-50 animate-in slide-in-from-left duration-200">
            <div>
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
                    S
                  </div>
                  <div>
                    <h1 className="font-bold text-base tracking-tight">SplitFlow</h1>
                    <p className="text-[11px] text-muted-foreground">Expense & Split Manager</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-sm font-bold transition-colors"
                  aria-label="Close navigation drawer"
                >
                  ✕
                </button>
              </div>

              <nav className="p-3 space-y-1">
                {[
                  { id: "dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
                  { id: "expenses", label: "Expenses", icon: Invoice01Icon },
                  { id: "groups", label: "Groups", icon: UserGroupIcon },
                  { id: "settlements", label: "Settlements", icon: TransactionIcon },
                  { id: "budgets", label: "Budgets", icon: Target01Icon },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <HugeiconsIcon icon={item.icon} size={18} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Mobile User Profile & Sign Out */}
            <div className="p-4 border-t border-border space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="size-8 rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center text-xs">
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{session.user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive gap-2 justify-start"
                onClick={() => authClient.signOut()}
              >
                <HugeiconsIcon icon={Logout01Icon} size={14} />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar Navigation (Collapsible) */}
      <aside
        className={`border-r border-border bg-card flex-col justify-between hidden md:flex transition-all duration-200 shrink-0 ${
          isDesktopSidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div>
          <div className={`p-4 border-b border-border flex items-center ${isDesktopSidebarCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              S
            </div>
            {!isDesktopSidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-base tracking-tight truncate">SplitFlow</h1>
                <p className="text-[11px] text-muted-foreground truncate">Expense & Split Manager</p>
              </div>
            )}
          </div>

          <nav className="p-2 space-y-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
              { id: "expenses", label: "Expenses", icon: Invoice01Icon },
              { id: "groups", label: "Groups", icon: UserGroupIcon },
              { id: "settlements", label: "Settlements", icon: TransactionIcon },
              { id: "budgets", label: "Budgets", icon: Target01Icon },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                title={isDesktopSidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  isDesktopSidebarCollapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                } rounded-lg text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <HugeiconsIcon icon={item.icon} size={18} />
                {!isDesktopSidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        {/* Desktop User Profile & Sign Out */}
        <div className="p-3 border-t border-border space-y-2">
          {!isDesktopSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <div className="size-8 rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{session.user.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-destructive gap-2 justify-start"
                onClick={() => authClient.signOut()}
              >
                <HugeiconsIcon icon={Logout01Icon} size={14} />
                <span>Sign Out</span>
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="size-8 rounded-full bg-primary/20 text-primary font-semibold flex items-center justify-center text-xs"
                title={session.user.name || session.user.email}
              >
                {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-8 p-0 text-muted-foreground hover:text-destructive flex items-center justify-center"
                onClick={() => authClient.signOut()}
                title="Sign Out"
              >
                <HugeiconsIcon icon={Logout01Icon} size={14} />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden size-9 p-0 flex items-center justify-center border-border shrink-0"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open sidebar menu"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>

            {/* Desktop Toggle Button */}
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:flex size-9 p-0 items-center justify-center text-muted-foreground hover:text-foreground shrink-0 rounded-lg hover:bg-muted"
              onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
              title={isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label="Toggle sidebar collapse"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isDesktopSidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </Button>

            <h2 className="text-base sm:text-lg font-bold capitalize truncate">
              {activeTab === "dashboard" && "Personal & Group Overview"}
              {activeTab === "expenses" && "All Expenses"}
              {activeTab === "groups" && "Active Groups"}
              {activeTab === "settlements" && "Settlement & Debt Simplification"}
              {activeTab === "budgets" && "Monthly Budget Tracking"}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <ThemeToggle />
            {activeTab === "groups" && (
              <Button size="sm" variant="outline" className="gap-1.5 hidden sm:inline-flex" onClick={() => setIsCreateGroupOpen(true)}>
                <HugeiconsIcon icon={Add01Icon} size={14} />
                <span>New Group</span>
              </Button>
            )}
            {activeTab === "budgets" && (
              <Button size="sm" variant="outline" className="gap-1.5 hidden sm:inline-flex" onClick={() => setIsBudgetOpen(true)}>
                <HugeiconsIcon icon={Add01Icon} size={14} />
                <span>Set Budget</span>
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={() => setIsAddExpenseOpen(true)}>
              <HugeiconsIcon icon={Add01Icon} size={14} />
              <span className="hidden xs:inline">Add Expense</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {/* Pending Invitations Banner (if any) */}
          {pendingInvitations.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/10 p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-amber-500 animate-ping" />
                  <h4 className="text-sm font-bold text-foreground">
                    Pending Group Invitations ({pendingInvitations.length})
                  </h4>
                </div>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  Accept to join and split expenses
                </span>
              </div>
              <div className="space-y-2">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-card border border-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <p className="font-semibold text-sm">{inv.groupName}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited by <span className="text-foreground font-medium">{inv.senderName}</span> ({inv.senderEmail}) • {inv.createdAt}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-border"
                        onClick={() => handleRejectInvitation(inv.id)}
                        disabled={isPending}
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-primary text-primary-foreground gap-1.5"
                        onClick={() => handleAcceptInvitation(inv.id)}
                        disabled={isPending}
                      >
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                        <span>Accept & Join</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium">Net Group Balance</CardDescription>
                    <CardTitle
                      className={`text-2xl font-bold ${
                        netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {netBalance >= 0 ? `+₹${netBalance.toLocaleString()}` : `-₹${Math.abs(netBalance).toLocaleString()}`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Live balance synced across all PostgreSQL group records.
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium">You are Owed</CardDescription>
                    <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{totalYouAreOwed.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Positive balance across shared groups
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium">You Owe</CardDescription>
                    <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                      ₹{totalYouOwe.toLocaleString()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    Pending debt owed to group members
                  </CardContent>
                </Card>
              </div>

              {/* Monochromatic Interactive Analytics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <SpendingTrendChart expenses={expenses} currencySymbol="₹" />
                </div>
                <div>
                  <CategoryBreakdownChart expenses={expenses} currencySymbol="₹" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Recent Transactions</h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab("expenses")}>
                      View all ({expenses.length})
                    </Button>
                  </div>

                  {expenses.length === 0 ? (
                    <Card className="p-8 text-center text-muted-foreground text-sm">
                      No expenses recorded yet. Click "+ Add Expense" to start.
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {expenses.slice(0, 5).map((exp) => (
                        <Card key={exp.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3.5">
                            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                              <HugeiconsIcon icon={Invoice01Icon} size={18} />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-foreground">{exp.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {exp.groupName ? `${exp.groupName} • ` : "Personal • "}
                                {exp.category} • {exp.date}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">₹{exp.amount.toLocaleString()}</p>
                            <Badge variant={exp.isGroup ? "secondary" : "outline"} className="text-[10px]">
                              {exp.isGroup ? "Group Split" : "Personal"}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Active Groups</h3>
                    <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setIsCreateGroupOpen(true)}>
                      <HugeiconsIcon icon={Add01Icon} size={12} />
                      <span>Create</span>
                    </Button>
                  </div>

                  {groups.length === 0 ? (
                    <Card className="p-6 text-center text-muted-foreground text-xs">
                      No groups created yet. Create a group with friends to split bills.
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {groups.map((g) => (
                        <Card key={g.id} className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{g.name}</p>
                            <Badge variant={g.userNetBalance >= 0 ? "success" : "destructive"}>
                              {g.userNetBalance >= 0 ? `+₹${g.userNetBalance}` : `-₹${Math.abs(g.userNetBalance)}`}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{g.members.length} members</span>
                            <span className="font-medium text-foreground">Total: ₹{g.totalSpent.toLocaleString()}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === "expenses" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Showing {expenses.length} live database records</p>
                <Button size="sm" className="gap-1.5" onClick={() => setIsAddExpenseOpen(true)}>
                  <HugeiconsIcon icon={Add01Icon} size={14} />
                  <span>Add Expense</span>
                </Button>
              </div>

              {expenses.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground text-sm">
                  No expenses found. Add your first expense to begin tracking.
                </Card>
              ) : (
                <div className="space-y-3">
                  {expenses.map((exp) => (
                    <Card key={exp.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <HugeiconsIcon icon={Invoice01Icon} size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{exp.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {exp.groupName ? (
                              <span className="font-medium text-foreground">{exp.groupName}</span>
                            ) : (
                              "Personal"
                            )}{" "}
                            • {exp.category} • {exp.date}
                          </p>
                          {exp.splits && exp.splits.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {exp.splits.map((s: any) => (
                                <span key={s.userId} className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">
                                  {s.userName}: ₹{s.amount}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <div className="text-right">
                          <p className="font-bold text-base">₹{exp.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{exp.paymentMethod}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-rose-500 hover:text-rose-700"
                          onClick={async () => {
                            try {
                              await deleteExpense(exp.id);
                              toast.success("Expense deleted");
                              loadData();
                            } catch (err: any) {
                              toast.error(err.message || "Failed to delete expense");
                            }
                          }}
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={16} />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* GROUPS TAB */}
          {activeTab === "groups" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Manage group members, shared expenses and settlement graphs</p>
                <Button size="sm" className="gap-1.5" onClick={() => setIsCreateGroupOpen(true)}>
                  <HugeiconsIcon icon={Add01Icon} size={14} />
                  <span>Create Group</span>
                </Button>
              </div>

              {groups.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground text-sm">
                  No groups yet. Click "+ Create Group" to add friends and start splitting expenses.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groups.map((group) => (
                    <Card key={group.id} className="p-6 space-y-4 border-border shadow-sm flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Group Title & Net Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold">{group.name}</h3>
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {group.currency || "INR"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{group.description || "Shared Group"}</p>
                          </div>
                          <Badge variant={group.userNetBalance >= 0 ? "success" : "destructive"} className="shrink-0 text-xs font-semibold">
                            {group.userNetBalance > 0
                              ? `You are owed ₹${group.userNetBalance.toLocaleString()}`
                              : group.userNetBalance < 0
                              ? `You owe ₹${Math.abs(group.userNetBalance).toLocaleString()}`
                              : "You are settled up"}
                          </Badge>
                        </div>

                        {/* Who Spent Money & Member Share Breakdown */}
                        <div className="p-3.5 bg-muted/40 rounded-xl space-y-3 border border-border/60">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <HugeiconsIcon icon={Invoice01Icon} size={14} className="text-primary" />
                              <span>Who Spent Money & Member Balances</span>
                            </p>
                            <span className="text-[11px] text-muted-foreground">
                              Total spent: <strong className="text-foreground">₹{group.totalSpent.toLocaleString()}</strong>
                            </span>
                          </div>

                          <div className="space-y-2">
                            {group.members.map((m: any) => (
                              <div
                                key={m.id}
                                className="p-2.5 bg-card border border-border/80 rounded-lg flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="size-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[11px] shrink-0">
                                    {m.name ? m.name.charAt(0).toUpperCase() : "M"}
                                  </div>
                                  <div className="truncate">
                                    <p className="font-semibold text-foreground truncate flex items-center gap-1">
                                      <span>{m.name}</span>
                                      {m.role === "OWNER" && (
                                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-bold">
                                          Admin
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      Spent: <strong className="text-foreground">₹{(m.totalPaid || 0).toLocaleString()}</strong> • Share: ₹{(m.totalShare || 0).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  {m.netBalance > 0 ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      +₹{m.netBalance.toLocaleString()} (Gets back)
                                    </span>
                                  ) : m.netBalance < 0 ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                      -₹{Math.abs(m.netBalance).toLocaleString()} (Owes)
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                                      Settled
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Awaiting Acceptance Invites */}
                          {group.pendingInvitations && group.pendingInvitations.length > 0 && (
                            <div className="border-t border-border/60 pt-2">
                              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                                Pending Invitations ({group.pendingInvitations.length})
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {group.pendingInvitations.map((p: any) => (
                                  <span
                                    key={p.id}
                                    className="text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 font-medium"
                                  >
                                    <span>⏳</span>
                                    <span>{p.email}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Who Owes Whom (Direct Debt Settlement Plan) */}
                        <div className="p-3.5 bg-primary/5 rounded-xl space-y-2.5 border border-primary/20">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <HugeiconsIcon icon={TransactionIcon} size={14} className="text-primary" />
                              <span>Who Owes Whom</span>
                            </p>
                            <span className="text-[10px] text-muted-foreground">Minimal Settlement Graph</span>
                          </div>

                          {group.debts && group.debts.length > 0 ? (
                            <div className="space-y-2">
                              {group.debts.map((debt: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-card border border-border rounded-lg flex items-center justify-between gap-2 text-xs shadow-2xs"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-semibold text-rose-600 dark:text-rose-400 truncate">
                                      {debt.fromUserName}
                                    </span>
                                    <span className="text-muted-foreground">owes</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                                      {debt.toUserName}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-sm text-foreground">
                                      ₹{debt.amount.toLocaleString()}
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-[11px] font-semibold border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                      onClick={() =>
                                        handleQuickSettle(group.id, debt.fromUserId, debt.toUserId, debt.amount)
                                      }
                                    >
                                      Settle Up
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-3 bg-card/60 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                              ✓ All members are settled up! No outstanding debts.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-border">
                        <span className="text-xs text-muted-foreground">
                          {group.members.length} {group.members.length === 1 ? "member" : "members"}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs font-semibold"
                          onClick={() => handleOpenGroupPlan(group.id)}
                        >
                          <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />
                          <span>Detailed Debt Graph</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTLEMENTS TAB */}
          {activeTab === "settlements" && (
            <div className="space-y-6">
              {activeGroupPlan && (
                <Card className="border-primary/30 bg-primary/5 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <HugeiconsIcon icon={SparklesIcon} size={18} className="text-primary" />
                        <span>Smart Debt Simplification: {activeGroupPlan.group.name}</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Minimizes overall transactions using greedy flow matching.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {activeGroupPlan.simplifiedTransactions.map((tx: any, idx: number) => (
                      <div key={idx} className="p-3 bg-background rounded-lg border border-border flex items-center justify-between">
                        <div className="text-xs">
                          <p className="font-semibold text-foreground">{tx.fromUserName}</p>
                          <p className="text-muted-foreground">owes {tx.toUserName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-primary">₹{tx.amount.toLocaleString()}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px]"
                            onClick={() => {
                              setSettlePayer(tx.fromUserId);
                              setSettleReceiver(tx.toUserId);
                              setSettleAmount(tx.amount.toString());
                              setSettleGroupId(activeGroupPlan.group.id);
                              setIsSettleOpen(true);
                            }}
                          >
                            Settle now
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Member Net Balances Recharts Bar Chart */}
                  <div className="pt-2">
                    <GroupBalanceBarChart
                      currencySymbol="₹"
                      groupTitle={`Member Balance Distribution: ${activeGroupPlan.group.name}`}
                      balances={activeGroupPlan.group.members.map((m: any) => ({
                        name: m.name || m.email?.split("@")[0] || "Member",
                        net: Number(m.netBalance || 0),
                      }))}
                    />
                  </div>
                </Card>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Settlement History</h3>
                {settlements.length === 0 ? (
                  <Card className="p-8 text-center text-muted-foreground text-xs">
                    No settlements recorded yet.
                  </Card>
                ) : (
                  settlements.map((set) => (
                    <Card key={set.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            <span className="font-bold">{set.payerName}</span> paid{" "}
                            <span className="font-bold">{set.receiverName}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {set.groupName || "Direct"} • {set.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          ₹{set.amount.toLocaleString()}
                        </p>
                        <Badge variant="success" className="text-[10px]">Completed</Badge>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BUDGETS TAB */}
          {activeTab === "budgets" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Monitor monthly category spending thresholds</p>
                <Button size="sm" className="gap-1.5" onClick={() => setIsBudgetOpen(true)}>
                  <HugeiconsIcon icon={Add01Icon} size={14} />
                  <span>Set Budget</span>
                </Button>
              </div>

              {/* Recharts Budget Analytics */}
              <BudgetProgressChart
                currencySymbol="₹"
                budgets={budgets.map((b) => ({
                  category: b.category,
                  budget: Number(b.allocatedAmount || 0),
                  spent: Number(b.spentAmount || 0),
                }))}
              />

              {budgets.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground text-sm">
                  No monthly budgets set yet. Click "+ Set Budget" to allocate spending limits.
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {budgets.map((b) => {
                    const pct = Math.round((b.spentAmount / b.allocatedAmount) * 100);
                    const isHigh = pct >= 80;
                    return (
                      <Card key={b.id} className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{b.category}</p>
                          <Badge variant={isHigh ? "warning" : "secondary"}>
                            {pct}% used
                          </Badge>
                        </div>

                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isHigh ? "bg-amber-500" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Spent: ₹{b.spentAmount.toLocaleString()}</span>
                          <span>Budget: ₹{b.allocatedAmount.toLocaleString()}</span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ADD EXPENSE MODAL */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-lg bg-card border-border shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Add Expense</CardTitle>
                <button
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>
              <CardDescription className="text-xs">
                Saves directly to database with multi-payer & transaction safety.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleAddExpense}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Expense Title</label>
                  <Input
                    placeholder="e.g. Dinner, Rent, Groceries"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Amount (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Category</label>
                    <Select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                    >
                      <SelectItem value="Food">Food & Dining</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                      <SelectItem value="Bills">Bills & Utilities</SelectItem>
                      <SelectItem value="Shopping">Shopping</SelectItem>
                      <SelectItem value="Entertainment">Entertainment</SelectItem>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Expense Scope</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={!expenseIsGroup ? "default" : "outline"}
                      onClick={() => setExpenseIsGroup(false)}
                      className="flex-1 gap-1.5"
                    >
                      <HugeiconsIcon icon={UserIcon} size={14} />
                      <span>Personal</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={expenseIsGroup ? "default" : "outline"}
                      onClick={() => setExpenseIsGroup(true)}
                      className="flex-1 gap-1.5"
                    >
                      <HugeiconsIcon icon={UserGroupIcon} size={14} />
                      <span>Group Shared</span>
                    </Button>
                  </div>
                </div>

                {expenseIsGroup && (
                  <div className="space-y-3 p-3 bg-muted/40 rounded-lg border border-border">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium">Select Group</label>
                        {groups.length === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddExpenseOpen(false);
                              setIsCreateGroupOpen(true);
                            }}
                            className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                          >
                            + Create a Group
                          </button>
                        )}
                      </div>
                      <Select
                        value={expenseGroupId}
                        onChange={(e) => setExpenseGroupId(e.target.value)}
                        disabled={groups.length === 0}
                      >
                        {groups.length === 0 ? (
                          <SelectItem value="" disabled>
                            None (No groups created yet)
                          </SelectItem>
                        ) : (
                          groups.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))
                        )}
                      </Select>
                      {groups.length === 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          No groups available. Create a group to split shared expenses.
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Split Calculation</label>
                      <div className="flex gap-2 text-xs">
                        {["EQUAL", "PERCENTAGE", "SHARES"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setExpenseSplitType(m as any)}
                            className={`flex-1 py-1.5 rounded-md border text-xs font-medium capitalize ${
                              expenseSplitType === m
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border hover:bg-muted"
                            }`}
                          >
                            {m.toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddExpenseOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Save Expense
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-card border-border shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Create New Group</CardTitle>
                <button
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>
              <CardDescription className="text-xs">
                Invite friends to split trips, rent, and outings together.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateGroup}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Group Name</label>
                  <Input
                    placeholder="e.g. Goa Trip, Flat 402"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Description (Optional)</label>
                  <Input
                    placeholder="e.g. Weekend holiday"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Member Emails (Comma separated)</label>
                  <Input
                    placeholder="friend1@example.com, friend2@example.com"
                    value={groupMemberEmails}
                    onChange={(e) => setGroupMemberEmails(e.target.value)}
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateGroupOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Create Group
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* RECORD SETTLEMENT MODAL */}
      {isSettleOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-card border-border shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Record Settlement</CardTitle>
                <button
                  onClick={() => setIsSettleOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>
              <CardDescription className="text-xs">
                Write a permanent settlement transaction to the database.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleRecordSettlement}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Select Group (Optional)</label>
                  <Select
                    value={settleGroupId}
                    onChange={(e) => {
                      setSettleGroupId(e.target.value);
                      const selected = groups.find((g) => g.id === e.target.value);
                      if (selected && selected.members.length >= 2) {
                        setSettlePayer(selected.members[0].userId);
                        setSettleReceiver(selected.members[1].userId);
                      }
                    }}
                  >
                    <SelectItem value="">Personal Direct Settlement</SelectItem>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Who Paid (Payer)</label>
                    <Select
                      value={settlePayer}
                      onChange={(e) => setSettlePayer(e.target.value)}
                      required
                    >
                      <SelectItem value="" disabled>
                        Select Payer
                      </SelectItem>
                      {settleGroupId && groups.find((g) => g.id === settleGroupId)
                        ? groups
                            .find((g) => g.id === settleGroupId)!
                            .members.map((m: any) => (
                              <SelectItem key={m.userId} value={m.userId}>
                                {m.name}
                              </SelectItem>
                            ))
                        : session?.user && (
                            <SelectItem value={session.user.id}>
                              {session.user.name || session.user.email} (You)
                            </SelectItem>
                          )}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Who Received (Payee)</label>
                    <Select
                      value={settleReceiver}
                      onChange={(e) => setSettleReceiver(e.target.value)}
                      required
                    >
                      <SelectItem value="" disabled>
                        Select Receiver
                      </SelectItem>
                      {settleGroupId && groups.find((g) => g.id === settleGroupId)
                        ? groups
                            .find((g) => g.id === settleGroupId)!
                            .members.filter((m: any) => m.userId !== settlePayer)
                            .map((m: any) => (
                              <SelectItem key={m.userId} value={m.userId}>
                                {m.name}
                              </SelectItem>
                            ))
                        : groups
                            .flatMap((g) => g.members)
                            .filter((m: any) => m.userId !== session?.user?.id)
                            .map((m: any) => (
                              <SelectItem key={m.userId} value={m.userId}>
                                {m.name}
                              </SelectItem>
                            ))}
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Amount (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSettleOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Confirm Settlement
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* BUDGET MODAL */}
      {isBudgetOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-card border-border shadow-xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Set Monthly Budget</CardTitle>
                <button
                  onClick={() => setIsBudgetOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} />
                </button>
              </div>
              <CardDescription className="text-xs">
                Define monthly spend limits per category.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleUpsertBudget}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Category</label>
                  <Select
                    value={budgetCategory}
                    onChange={(e) => setBudgetCategory(e.target.value)}
                  >
                    <SelectItem value="Food">Food & Dining</SelectItem>
                    <SelectItem value="Transport">Transport</SelectItem>
                    <SelectItem value="Bills">Bills & Utilities</SelectItem>
                    <SelectItem value="Shopping">Shopping</SelectItem>
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Budget Limit (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 10000"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBudgetOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Save Budget
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <SplitWiseApp />;
}


