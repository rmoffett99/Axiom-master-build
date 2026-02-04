import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import type { User, Team } from "@shared/schema";

const decisionFormSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  context: z.string().min(20, "Context must be at least 20 characters"),
  rationale: z.string().min(20, "Rationale must be at least 20 characters"),
  outcome: z.string().min(10, "Outcome must be at least 10 characters"),
  alternatives: z.string().optional(),
  risks: z.string().optional(),
  ownerId: z.string().min(1, "Owner is required"),
  teamId: z.string().optional(),
  reviewByDate: z.string().optional(),
  assumptions: z.array(z.object({
    description: z.string().min(5, "Assumption must be at least 5 characters"),
    validUntil: z.string().optional(),
  })).min(3, "At least 3 assumptions are required"),
});

type DecisionFormData = z.infer<typeof decisionFormSchema>;

const steps = [
  { id: 1, title: "Basic Info", description: "Title and ownership" },
  { id: 2, title: "Context", description: "Background and rationale" },
  { id: 3, title: "Assumptions", description: "Key assumptions (min 3)" },
  { id: 4, title: "Review", description: "Confirm and publish" },
];

export default function DecisionNewPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const form = useForm<DecisionFormData>({
    resolver: zodResolver(decisionFormSchema),
    defaultValues: {
      title: "",
      context: "",
      rationale: "",
      outcome: "",
      alternatives: "",
      risks: "",
      ownerId: "",
      teamId: "",
      reviewByDate: "",
      assumptions: [
        { description: "", validUntil: "" },
        { description: "", validUntil: "" },
        { description: "", validUntil: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "assumptions",
  });

  const createMutation = useMutation({
    mutationFn: async (data: DecisionFormData) => {
      const response = await apiRequest("POST", "/api/decisions", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/decisions"] });
      toast({ title: "Decision created", description: "Your decision has been recorded." });
      navigate(`/decisions/${data.id}`);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to create decision. Please try again.",
        variant: "destructive"
      });
    },
  });

  const canProceed = () => {
    const values = form.getValues();
    switch (currentStep) {
      case 1:
        return values.title.length >= 5 && values.ownerId.length > 0;
      case 2:
        return values.context.length >= 20 && values.rationale.length >= 20 && values.outcome.length >= 10;
      case 3:
        const validAssumptions = values.assumptions.filter(a => a.description.length >= 5);
        return validAssumptions.length >= 3;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate("/decisions");
    }
  };

  const onSubmit = (data: DecisionFormData) => {
    createMutation.mutate(data);
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">New Decision</h1>
          <p className="text-muted-foreground">Create an append-only decision record</p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              {steps.map((step) => (
                <div 
                  key={step.id} 
                  className={`flex-1 text-center ${step.id === currentStep ? "text-primary font-medium" : step.id < currentStep ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {step.id < currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">
                        {step.id}
                      </span>
                    )}
                    <span className="hidden sm:inline">{step.title}</span>
                  </div>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Define the decision title and assign ownership</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Migrate to microservices architecture" 
                          {...field} 
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormDescription>
                        A clear, concise title that summarizes the decision
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decision Owner *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-owner">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The person accountable for this decision
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teamId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-team">
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams?.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reviewByDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review By Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-review-date" />
                      </FormControl>
                      <FormDescription>
                        When should this decision be reviewed?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Context */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Context & Rationale</CardTitle>
                <CardDescription>Document why this decision was made</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="context"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Context *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What is the background? What problem are we solving?"
                          className="min-h-24"
                          {...field} 
                          data-testid="input-context"
                        />
                      </FormControl>
                      <FormDescription>
                        Background and circumstances leading to this decision
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rationale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rationale *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Why is this the right decision? What factors influenced it?"
                          className="min-h-24"
                          {...field} 
                          data-testid="input-rationale"
                        />
                      </FormControl>
                      <FormDescription>
                        The reasoning behind this decision
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What exactly is the decision?"
                          className="min-h-20"
                          {...field} 
                          data-testid="input-outcome"
                        />
                      </FormControl>
                      <FormDescription>
                        The decision itself
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="alternatives"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alternatives Considered</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What other options were considered?"
                          className="min-h-20"
                          {...field} 
                          data-testid="input-alternatives"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="risks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risks</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What are the known risks?"
                          className="min-h-20"
                          {...field} 
                          data-testid="input-risks"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Assumptions */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Assumptions
                  <span className="text-sm font-normal text-muted-foreground">(minimum 3 required)</span>
                </CardTitle>
                <CardDescription>
                  What must remain true for this decision to be valid?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length < 3 && (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4" />
                    At least 3 assumptions are required
                  </div>
                )}

                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start p-4 rounded-md border bg-card">
                    <div className="flex-1 space-y-3">
                      <FormField
                        control={form.control}
                        name={`assumptions.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Assumption {index + 1}</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="e.g., Market conditions remain stable"
                                className="min-h-16"
                                {...field} 
                                data-testid={`input-assumption-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`assumptions.${index}.validUntil`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Valid Until (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field} 
                                data-testid={`input-assumption-date-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    {fields.length > 3 && (
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={() => remove(index)}
                        data-testid={`button-remove-assumption-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({ description: "", validUntil: "" })}
                  className="w-full"
                  data-testid="button-add-assumption"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Assumption
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Publish</CardTitle>
                <CardDescription>
                  Review your decision before publishing. Once published, this record becomes append-only.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Title</Label>
                    <p className="font-medium">{form.getValues("title")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Owner</Label>
                    <p>{users?.find(u => u.id === form.getValues("ownerId"))?.displayName || "Not selected"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Context</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.getValues("context")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Rationale</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.getValues("rationale")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Outcome</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.getValues("outcome")}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Assumptions ({form.getValues("assumptions").filter(a => a.description).length})</Label>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {form.getValues("assumptions").filter(a => a.description).map((a, i) => (
                        <li key={i}>{a.description}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-md bg-muted/50 text-sm">
                  <p className="font-medium mb-1">Important</p>
                  <p className="text-muted-foreground">
                    Once published, this decision record cannot be deleted or modified — only amended with new versions.
                    This ensures complete audit trail and institutional memory.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between gap-4">
            <Button type="button" variant="outline" onClick={handleBack} data-testid="button-step-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {currentStep === 1 ? "Cancel" : "Back"}
            </Button>

            {currentStep < steps.length ? (
              <Button 
                type="button" 
                onClick={handleNext} 
                disabled={!canProceed()}
                data-testid="button-step-next"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-publish-decision"
              >
                {createMutation.isPending ? (
                  "Publishing..."
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Publish Decision
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
