import { useRouter } from "next/router";
import { useAuth } from "../auth";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../../auth";

export function useLogin() {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: any) => authApi.login(data),
    onSuccess: (data) => {
      login(data.token, data.user);
      router.push("/dashboard");
    },
  });
}

export function useRegister() {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: any) => authApi.register(data),
    onSuccess: (data) => {
      login(data.token, data.user);
      router.push("/dashboard");
    },
  });
}
