/** 누르고 잊는 호출이 실패했을 때 부른다. 화면에는 보이지 않고 개발자 도구에서 본다. action은 짧은 영어 낱말이다(예: 'pin'). */
export type Report = (action: string, error: unknown) => void;

export const reportToConsole: Report = (action, error) => {
  console.error('TodoWidget', action, error);
};
