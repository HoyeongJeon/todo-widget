<script lang="ts">
  import type { ResizeEdge } from '../../domain/resize.ts';

  let { onresize }: { onresize: (edge: ResizeEdge, event: PointerEvent) => void } = $props();

  /** 왼쪽 버튼으로 누르면 창 밖에서도 pointer를 받게 잡고 바로 크기 조절을 시작한다 (WND-03). */
  function start(edge: ResizeEdge) {
    return (event: PointerEvent & { currentTarget: HTMLElement }): void => {
      if (event.button !== 0)
        return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onresize(edge, event);
    };
  }
</script>

<div class="edge north" role="presentation" onpointerdown={start('North')}></div>
<div class="edge south" role="presentation" onpointerdown={start('South')}></div>
<div class="edge east" role="presentation" onpointerdown={start('East')}></div>
<div class="edge west" role="presentation" onpointerdown={start('West')}></div>
<div class="edge north-east" role="presentation" onpointerdown={start('NorthEast')}></div>
<div class="edge north-west" role="presentation" onpointerdown={start('NorthWest')}></div>
<div class="edge south-east" role="presentation" onpointerdown={start('SouthEast')}></div>
<div class="edge south-west" role="presentation" onpointerdown={start('SouthWest')}></div>

<style>
  /* 카드 둘레 그림자 여백(10) 안에만 있다. 창을 메뉴용으로 늘려도 카드 둘레에 남는다.
     macOS는 alpha가 0인 픽셀의 클릭을 뒤 앱으로 넘기므로, 눈에 거의 안 보이지만 0이 아닌 배경을 둔다 (계획 4 PM 확인). */
  .edge {
    position: absolute;
    z-index: 1;
    background: rgba(0, 0, 0, 0.01);
  }

  .north {
    top: 0;
    left: 14px;
    right: 14px;
    height: 8px;
    cursor: ns-resize;
  }

  .south {
    bottom: 0;
    left: 14px;
    right: 14px;
    height: 8px;
    cursor: ns-resize;
  }

  .east {
    top: 14px;
    bottom: 14px;
    right: 0;
    width: 8px;
    cursor: ew-resize;
  }

  .west {
    top: 14px;
    bottom: 14px;
    left: 0;
    width: 8px;
    cursor: ew-resize;
  }

  .north-east {
    top: 0;
    right: 0;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
  }

  .north-west {
    top: 0;
    left: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
  }

  .south-east {
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
  }

  .south-west {
    bottom: 0;
    left: 0;
    width: 14px;
    height: 14px;
    cursor: nesw-resize;
  }
</style>
