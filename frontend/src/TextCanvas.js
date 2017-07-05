import React from "react";
import ReactDOM from "react-dom";

export default class TextCanvas extends React.Component {
    constructor(props) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        
    }

    draw(cvs) {
        if(!cvs) return;

        let ctx = cvs.getContext("2d");

        let fontSize = parseInt(this.props.fontSize) || 16;
        let fontFamily = this.props.fontFamily || "Arial";
        let fontDesc = "" + fontSize + "px " + fontFamily;
        let text = this.props.text;

        ctx.font = fontDesc;
        let textWidth = ctx.measureText(text).width;
        let textHeight = fontSize;

        cvs.width = textWidth + fontSize;
        cvs.height = textHeight * 1.5;
        ctx.font = fontDesc;

        ctx.fillText(text, 0, textHeight);
    }

    render() {
        return <canvas width="0" height="0" ref={cvs => this.draw(cvs)}></canvas>
    }
}
