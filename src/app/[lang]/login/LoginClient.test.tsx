/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginClient from "./LoginClient";

const { signInEmailMock, pushMock, useSearchParamsMock } = vi.hoisted(() => ({
  signInEmailMock: vi.fn(),
  pushMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: signInEmailMock,
    },
  },
}));

const translations = {
  title: "Welcome back",
  subtitle: "Sign in to continue.",
  brandBody: "",
  heritageTagline: "",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  passwordLabel: "Password",
  passwordPlaceholder: "Password",
  rememberMe: "Remember me",
  submit: "Sign in",
  submitting: "Signing in...",
  forgotPassword: "Forgot password?",
  noAccount: "Need an account?",
  signupLink: "Create one",
  errors: {
    requiredEmail: "Email is required.",
    invalidEmail: "Enter a valid email.",
    requiredPassword: "Password is required.",
    invalidCredentials: "Invalid email or password.",
    generic: "Something went wrong.",
  },
};

describe("LoginClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInEmailMock.mockResolvedValue({});
    useSearchParamsMock.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
  });

  it("uses the plain dashboard callback for normal login", async () => {
    const user = userEvent.setup();

    render(<LoginClient lang="en" t={translations} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "password123!",
        callbackURL: "/en/dashboard",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/en/dashboard");
  });

  it("preserves a safe explicit callback for normal login", async () => {
    const user = userEvent.setup();
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams("callback=%2Fen%2Finvitations%2Faccept%2Ftoken"),
    );

    render(<LoginClient lang="en" t={translations} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "password123!",
        callbackURL: "/en/invitations/accept/token",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/en/invitations/accept/token");
  });

  it("preserves emailVerified for dashboard redirect when no callback is provided", async () => {
    const user = userEvent.setup();
    useSearchParamsMock.mockReturnValue(new URLSearchParams("emailVerified=1"));

    render(<LoginClient lang="en" t={translations} />);

    await user.type(screen.getByLabelText("Email"), "person@example.com");
    await user.type(screen.getByLabelText("Password"), "password123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInEmailMock).toHaveBeenCalledWith({
        email: "person@example.com",
        password: "password123!",
        callbackURL: "/en/dashboard?emailVerified=1",
      });
    });

    expect(pushMock).toHaveBeenCalledWith("/en/dashboard?emailVerified=1");
  });
});
