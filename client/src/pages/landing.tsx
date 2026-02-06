import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LayoutDashboard, Users, Zap, CheckCircle, ArrowRight, Columns3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Columns3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg tracking-tight" data-testid="text-brand">ProjectFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/api/login">
              <Button variant="ghost" data-testid="button-login-nav">Log in</Button>
            </a>
            <a href="/api/login">
              <Button data-testid="button-signup-nav">Get Started</Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-3.5 w-3.5" />
                Project management, simplified
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight font-serif">
                Ship faster with
                <span className="text-primary"> clarity</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                Plan, track, and deliver your projects with a powerful Kanban board. Built for modern teams
                that move fast and ship with confidence.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <a href="/api/login">
                  <Button size="lg" className="gap-2" data-testid="button-get-started">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-2">
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Free forever plan</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /> No credit card required</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-primary" /> Sign in with Google, Apple, or Microsoft</span>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="rounded-md border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b">
                  <div className="h-8 w-8 rounded-md bg-primary/20 flex items-center justify-center">
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Sprint Board</div>
                    <div className="text-xs text-muted-foreground">4 columns &middot; 12 issues</div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {["To Do", "In Progress", "In Review", "Done"].map((col, ci) => (
                    <div key={col} className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{col}</div>
                      {[...Array(ci === 1 ? 3 : ci === 3 ? 2 : ci === 0 ? 4 : 3)].map((_, i) => (
                        <div key={i} className="rounded-md border bg-background p-2.5 space-y-1.5">
                          <div className="h-2 rounded-full bg-muted w-full" />
                          <div className="h-2 rounded-full bg-muted w-3/4" />
                          <div className="flex items-center justify-between pt-1">
                            <div className="h-2 w-8 rounded-full bg-muted" />
                            <div className="h-4 w-4 rounded-full bg-muted" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-serif">Everything you need to ship</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              A complete project management toolkit designed for speed and simplicity.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Columns3,
                title: "Kanban Board",
                desc: "Visualize your workflow with drag-and-drop columns. Move issues through stages effortlessly.",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                desc: "Assign issues, leave comments, and stay aligned. Everyone knows what's happening.",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Built for speed. Create issues in seconds, search instantly, and never wait for your tools.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="p-6 space-y-3 hover-elevate">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
              <Columns3 className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-medium">ProjectFlow</span>
          </div>
          <span>&copy; {new Date().getFullYear()} ProjectFlow. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
