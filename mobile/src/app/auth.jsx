import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../lib/auth";
import { POLICY_URL } from "../lib/config";
import { Button, COLORS, Field, Icon, LinkButton, Logo, Notice } from "../components/ui";

// Шапка шага: иконка в оранжевом квадрате, заголовок и пояснение
function StepHeader({ icon, title, text, children }) {
  return (
    <View className="mb-7">
      {icon && (
        <View className="w-14 h-14 mb-5 rounded-2xl bg-accent/15 items-center justify-center">
          <Icon name={icon} size={28} color={COLORS.accent} />
        </View>
      )}
      <Text className="text-[26px] font-semibold text-white mb-2.5">{title}</Text>
      <Text className="text-[15px] text-muted">{text}</Text>
      {children}
    </View>
  );
}

// Поле для 6-значного кода из письма
const CodeField = ({ label, value, onChange }) => (
  <Field
    label={label}
    value={value}
    onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
    keyboardType="number-pad"
    textContentType="oneTimeCode"
    autoComplete="one-time-code"
    placeholder="000000"
    textClass="text-center text-2xl tracking-[8px]"
  />
);

// Вход, регистрация, подтверждение email и сброс пароля (как на сайте)
export default function AuthScreen() {
  const auth = useAuth();
  // 'auth' | 'forgot' (ввод email) | 'reset' (код и новый пароль)
  const [step, setStep] = useState("auth");
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Выполняет действие, показывая загрузку и текст ошибки от сервера
  const run = async (action) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await action();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goTo = (next) => {
    setStep(next);
    setError("");
    setSuccess("");
  };

  const submitAuth = () =>
    run(async () => {
      if (isLogin) {
        await auth.login(email, password);
      } else {
        if (!acceptedPolicy) throw new Error("Чтобы создать аккаунт, примите политику конфиденциальности");
        await auth.register(username, email, password);
        setSuccess("Регистрация успешна! Код отправлен на твой email.");
      }
    });

  let content;

  if (auth.needsVerification) {
    // ========== ПОДТВЕРЖДЕНИЕ EMAIL ==========
    content = (
      <>
        <StepHeader icon="mail" title="Подтверждение email" text="Мы отправили 6-значный код на адрес">
          <Text className="text-sm font-semibold text-white mt-1">{auth.user?.email || email}</Text>
        </StepHeader>
        <View className="gap-[18px]">
          <CodeField label="Код подтверждения" value={code} onChange={setCode} />
          {error ? <Notice error>{error}</Notice> : null}
          {success ? <Notice>{success}</Notice> : null}
          <Button
            title="Подтвердить"
            loading={loading}
            disabled={code.length !== 6}
            onPress={() => run(() => auth.verifyEmail(code))}
          />
          <LinkButton
            title="Отправить код повторно"
            tone="accent"
            icon="refresh-cw"
            disabled={loading}
            onPress={() =>
              run(async () => {
                await auth.resendCode();
                setSuccess("Новый код отправлен на email!");
              })
            }
          />
          <LinkButton title="Выйти" icon="arrow-left" onPress={auth.logout} />
        </View>
      </>
    );
  } else if (step === "forgot") {
    // ========== ЗАБЫЛИ ПАРОЛЬ: ВВОД EMAIL ==========
    content = (
      <>
        <StepHeader icon="key" title="Сброс пароля" text="Укажите email аккаунта, и мы отправим на него код" />
        <View className="gap-[18px]">
          <Field
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="your@email.com"
          />
          {error ? <Notice error>{error}</Notice> : null}
          <Button
            title="Отправить код"
            loading={loading}
            disabled={!email}
            onPress={() =>
              run(async () => {
                const data = await auth.forgotPassword(email);
                setStep("reset");
                setSuccess(data.message);
              })
            }
          />
          <LinkButton title="Вернуться ко входу" icon="arrow-left" onPress={() => goTo("auth")} />
        </View>
      </>
    );
  } else if (step === "reset") {
    // ========== ЗАБЫЛИ ПАРОЛЬ: КОД И НОВЫЙ ПАРОЛЬ ==========
    content = (
      <>
        <StepHeader icon="shield" title="Новый пароль" text="Введите код из письма и придумайте новый пароль" />
        <View className="gap-[18px]">
          <CodeField label="Код из письма" value={code} onChange={setCode} />
          <Field
            label="Новый пароль"
            icon="lock"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="new-password"
            maxLength={72}
            placeholder="Не менее 8 символов"
          />
          {error ? <Notice error>{error}</Notice> : null}
          {success && !error ? <Notice>{success}</Notice> : null}
          <Button
            title="Сменить пароль"
            loading={loading}
            disabled={code.length !== 6 || !newPassword}
            onPress={() =>
              run(async () => {
                if (newPassword.length < 8) throw new Error("Пароль должен содержать не менее 8 символов");
                await auth.resetPassword(email, code, newPassword);
                setStep("auth");
                setIsLogin(true);
                setPassword("");
                setCode("");
                setNewPassword("");
                setSuccess("Пароль изменён. Войдите с новым паролем.");
              })
            }
          />
          <LinkButton title="Отправить код ещё раз" tone="accent" onPress={() => goTo("forgot")} />
          <LinkButton title="Вернуться ко входу" icon="arrow-left" onPress={() => goTo("auth")} />
        </View>
      </>
    );
  } else {
    // ========== ВХОД / РЕГИСТРАЦИЯ ==========
    content = (
      <>
        <StepHeader
          title={isLogin ? "С возвращением" : "Создать аккаунт"}
          text={isLogin ? "Твой личный дневник киномана" : "Это бесплатно и займёт минуту"}
        />

        <View className="flex-row p-1 mb-6 rounded-[14px] bg-panel border border-white/[0.08]">
          {[
            { login: true, label: "Вход" },
            { login: false, label: "Регистрация" },
          ].map((tab) => (
            <Pressable
              key={tab.label}
              onPress={() => {
                setIsLogin(tab.login);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 h-11 rounded-[11px] items-center justify-center ${isLogin === tab.login ? "bg-card" : ""}`}
            >
              <Text className={`text-sm font-bold ${isLogin === tab.login ? "text-white" : "text-muted"}`}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="gap-[18px]">
          {!isLogin && (
            <Field
              label="Никнейм"
              icon="user"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              maxLength={20}
              placeholder="Как тебя называть"
            />
          )}
          <Field
            label="Email"
            icon="mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="your@email.com"
          />
          <Field
            label="Пароль"
            icon="lock"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isLogin ? "current-password" : "new-password"}
            maxLength={72}
            placeholder="Введите пароль"
          />

          {isLogin ? (
            <Pressable onPress={() => goTo("forgot")} className="self-end -mt-1 min-h-[36px] justify-center">
              <Text className="text-[13px] font-bold text-accent-light">Забыли пароль?</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setAcceptedPolicy((v) => !v)} className="flex-row items-start gap-3">
              <View
                className={`mt-0.5 w-[22px] h-[22px] rounded-md border items-center justify-center ${acceptedPolicy ? "bg-accent border-accent" : "border-white/30"}`}
              >
                {acceptedPolicy && <Icon name="check" size={14} color={COLORS.onAccent} />}
              </View>
              <Text className="flex-1 text-[13px] leading-5 text-muted">
                Я прочитал(а){" "}
                <Text className="text-accent-light font-bold" onPress={() => Linking.openURL(POLICY_URL)}>
                  политику конфиденциальности
                </Text>{" "}
                и даю согласие на обработку моих персональных данных
              </Text>
            </Pressable>
          )}

          {error ? <Notice error>{error}</Notice> : null}
          {success ? <Notice>{success}</Notice> : null}

          <Button
            title={isLogin ? "Войти" : "Создать аккаунт"}
            loading={loading}
            disabled={!email || !password || (!isLogin && (!username || !acceptedPolicy))}
            onPress={submitAuth}
            className="mt-2"
          />
        </View>
      </>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-10" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <Logo />
          </View>
          {content}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
