/** OS 대화 상자. 위젯을 띄우지 못할 때 알린다 (STORE-10). */
export interface Dialog {
  showError(title: string, message: string): Promise<void>;
}
